import { pool } from "../config/db.js";

export async function createTemplate({ governanceAreaId, year, title, notes, status, createdBy }) {
  const { rows } = await pool.query(
    `INSERT INTO checklist_templates (governance_area_id, year, title, notes, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [governanceAreaId, year, title, notes ?? null, status ?? "ACTIVE", createdBy ?? null]
  );
  return rows[0];
}

export async function getTemplateByGovYear(governanceAreaId, year) {
  const { rows } = await pool.query(
    `SELECT * FROM checklist_templates
     WHERE governance_area_id = $1 AND year = $2`,
    [governanceAreaId, year]
  );
  return rows[0] || null;
}

export async function getTemplateById(id) {
  const { rows } = await pool.query(
    `SELECT t.*, ga.code as governance_code, ga.name as governance_name
     FROM checklist_templates t
     JOIN governance_areas ga ON ga.id = t.governance_area_id
     WHERE t.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function listTemplates(year = null) {
  const params = [];
  const whereClause = year ? "WHERE t.year = $1" : "";
  if (year) params.push(year);

  const { rows } = await pool.query(
    `SELECT t.*, ga.code as governance_code, ga.name as governance_name,
            COUNT(ci.id)::int AS item_count
     FROM checklist_templates t
     JOIN governance_areas ga ON ga.id = t.governance_area_id
     LEFT JOIN checklist_items ci ON ci.template_id = t.id
     ${whereClause}
     GROUP BY t.id, ga.code, ga.name, ga.sort_order
     ORDER BY t.year DESC, ga.sort_order, ga.code`,
    params
  );
  return rows;
}

// kept for backward compatibility
export async function listTemplatesByYear(year) {
  return listTemplates(year);
}

export async function updateTemplate(id, { governanceAreaId, year, title, notes, status }) {
  const sets = [];
  const params = [];
  let i = 1;
  if (governanceAreaId !== undefined) { sets.push(`governance_area_id = $${i++}`); params.push(governanceAreaId); }
  if (year !== undefined)             { sets.push(`year = $${i++}`);              params.push(year); }
  if (title !== undefined)            { sets.push(`title = $${i++}`);             params.push(title); }
  if (notes !== undefined)            { sets.push(`notes = $${i++}`);             params.push(notes); }
  if (status !== undefined)           { sets.push(`status = $${i++}`);            params.push(status); }
  if (sets.length === 0) return getTemplateById(id);

  params.push(id);
  const { rows } = await pool.query(
    `UPDATE checklist_templates SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
    params
  );
  return rows[0] || null;
}

export async function deleteTemplate(id) {
  await pool.query(`DELETE FROM checklist_templates WHERE id = $1`, [id]);
}

export async function copyTemplateWithItems({ sourceTemplateId, governanceAreaId, year, title, notes, createdBy }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: newTplRows } = await client.query(
      `INSERT INTO checklist_templates (governance_area_id, year, title, notes, status, created_by)
       VALUES ($1,$2,$3,$4,'DRAFT',$5)
       RETURNING *`,
      [governanceAreaId, year, title, notes ?? null, createdBy ?? null]
    );
    const newTemplate = newTplRows[0];

    const { rows: items } = await client.query(
      `SELECT *
       FROM checklist_items
       WHERE template_id = $1
       ORDER BY sort_order, item_code`,
      [sourceTemplateId]
    );

    // Copy items while preserving parent-child structure (remap IDs)
    const idMap = new Map(); // oldItemId -> newItemId
    const remaining = new Map(items.map((it) => [it.id, it]));

    // Insert items in waves: parents first, then children
    while (remaining.size > 0) {
      let insertedThisPass = 0;

      for (const [oldId, it] of remaining) {
        const parentOld = it.parent_item_id;
        const parentNew = parentOld ? idMap.get(parentOld) : null;

        if (parentOld && !parentNew) continue; // wait until parent inserted

        const { rows: newItemRows } = await client.query(
          `INSERT INTO checklist_items
            (template_id, parent_item_id, item_code, title, description,
             is_required, frequency, due_date, allowed_file_types, max_files,
             sort_order, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           RETURNING id`,
          [
            newTemplate.id,
            parentNew,
            it.item_code,
            it.title,
            it.description,
            it.is_required,
            it.frequency,
            it.due_date,
            it.allowed_file_types,
            it.max_files,
            it.sort_order,
            it.is_active,
          ]
        );

        idMap.set(oldId, newItemRows[0].id);
        remaining.delete(oldId);
        insertedThisPass += 1;
      }

      if (insertedThisPass === 0) {
        // Broken hierarchy (e.g. parent missing). Fail fast.
        throw new Error("Unable to copy template items due to invalid parent relationships.");
      }
    }

    await client.query("COMMIT");
    return newTemplate;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

function nextUniqueCodeFactory(existingCodes) {
  const used = new Set(existingCodes);
  return (base) => {
    let candidate = base;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
    candidate = `${base}-COPY`;
    let n = 2;
    while (used.has(candidate)) {
      candidate = `${base}-COPY${n}`;
      n += 1;
    }
    used.add(candidate);
    return candidate;
  };
}

export async function importTemplateItems({ sourceTemplateId, targetTemplateId }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: existingCodes } = await client.query(
      `SELECT item_code FROM checklist_items WHERE template_id = $1`,
      [targetTemplateId]
    );
    const nextCode = nextUniqueCodeFactory(existingCodes.map((r) => r.item_code));

    const { rows: maxSortRows } = await client.query(
      `SELECT COALESCE(MAX(sort_order), 0)::int AS max_sort FROM checklist_items WHERE template_id = $1`,
      [targetTemplateId]
    );
    const sortOffset = (maxSortRows[0]?.max_sort ?? 0) + 1;

    const { rows: items } = await client.query(
      `SELECT *
       FROM checklist_items
       WHERE template_id = $1
       ORDER BY sort_order, item_code`,
      [sourceTemplateId]
    );

    // Copy items while preserving parent-child structure (remap IDs)
    const idMap = new Map(); // oldItemId -> newItemId
    const remaining = new Map(items.map((it) => [it.id, it]));
    const inserted = [];

    while (remaining.size > 0) {
      let insertedThisPass = 0;

      for (const [oldId, it] of remaining) {
        const parentOld = it.parent_item_id;
        const parentNew = parentOld ? idMap.get(parentOld) : null;
        if (parentOld && !parentNew) continue;

        const newCode = nextCode(it.item_code);

        const { rows: newItemRows } = await client.query(
          `INSERT INTO checklist_items
            (template_id, parent_item_id, item_code, title, description,
             is_required, frequency, due_date, allowed_file_types, max_files,
             sort_order, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           RETURNING *`,
          [
            targetTemplateId,
            parentNew,
            newCode,
            it.title,
            it.description,
            it.is_required,
            it.frequency,
            it.due_date,
            it.allowed_file_types,
            it.max_files,
            (it.sort_order ?? 0) + sortOffset,
            it.is_active,
          ]
        );

        const newItem = newItemRows[0];
        idMap.set(oldId, newItem.id);
        inserted.push(newItem);
        remaining.delete(oldId);
        insertedThisPass += 1;
      }

      if (insertedThisPass === 0) {
        throw new Error("Unable to import template items due to invalid parent relationships.");
      }
    }

    await client.query("COMMIT");
    return inserted;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getChecklistItemInTemplate(itemId, templateId) {
  const { rows } = await pool.query(
    `SELECT id FROM checklist_items WHERE id = $1 AND template_id = $2`,
    [itemId, templateId]
  );
  return rows[0] || null;
}

export async function createChecklistItem(payload) {
  const {
    templateId, parentItemId, itemCode, title, description,
    isRequired, frequency, dueDate, allowedFileTypes, maxFiles,
    sortOrder, isActive, enableReminder, reminderDaysBefore
  } = payload;

  const { rows } = await pool.query(
    `INSERT INTO checklist_items
      (template_id, parent_item_id, item_code, title, description,
       is_required, frequency, due_date, allowed_file_types, max_files,
       sort_order, is_active, enable_reminder, reminder_days_before)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      templateId,
      parentItemId ?? null,
      itemCode,
      title,
      description ?? null,
      isRequired ?? true,
      frequency ?? "ANNUAL",
      dueDate ?? null,
      allowedFileTypes ?? null,
      maxFiles ?? 0,
      sortOrder ?? 0,
      isActive ?? true,
      enableReminder ?? true,
      reminderDaysBefore ?? 7
    ]
  );

  return rows[0];
}

export async function listTemplateItems(templateId, includeInactive = false) {
  const whereClause = includeInactive
    ? "WHERE template_id = $1"
    : "WHERE template_id = $1 AND is_active = TRUE";
  const { rows } = await pool.query(
    `SELECT * FROM checklist_items ${whereClause} ORDER BY sort_order, item_code`,
    [templateId]
  );
  return rows;
}

export async function updateChecklistItemInTemplate(templateId, id, payload) {
  const {
    parentItemId, itemCode, title, description,
    isRequired, frequency, dueDate, allowedFileTypes, maxFiles,
    sortOrder, isActive, enableReminder, reminderDaysBefore
  } = payload;

  const sets = [];
  const params = [];
  let i = 1;
  if (parentItemId  !== undefined) { sets.push(`parent_item_id = $${i++}`);      params.push(parentItemId); }
  if (itemCode      !== undefined) { sets.push(`item_code = $${i++}`);           params.push(itemCode); }
  if (title         !== undefined) { sets.push(`title = $${i++}`);               params.push(title); }
  if (description   !== undefined) { sets.push(`description = $${i++}`);         params.push(description); }
  if (isRequired    !== undefined) { sets.push(`is_required = $${i++}`);         params.push(isRequired); }
  if (frequency     !== undefined) { sets.push(`frequency = $${i++}`);           params.push(frequency); }
  if (dueDate       !== undefined) { sets.push(`due_date = $${i++}`);            params.push(dueDate); }
  if (allowedFileTypes !== undefined) { sets.push(`allowed_file_types = $${i++}`); params.push(allowedFileTypes); }
  if (maxFiles      !== undefined) { sets.push(`max_files = $${i++}`);           params.push(maxFiles); }
  if (sortOrder     !== undefined) { sets.push(`sort_order = $${i++}`);          params.push(sortOrder); }
  if (isActive      !== undefined) { sets.push(`is_active = $${i++}`);           params.push(isActive); }
  if (enableReminder !== undefined) { sets.push(`enable_reminder = $${i++}`);     params.push(enableReminder); }
  if (reminderDaysBefore !== undefined) { sets.push(`reminder_days_before = $${i++}`); params.push(reminderDaysBefore); }
  if (sets.length === 0) {
    const { rows } = await pool.query(`SELECT * FROM checklist_items WHERE id = $1`, [id]);
    return rows[0] || null;
  }

  params.push(id, templateId);
  const { rows } = await pool.query(
    `UPDATE checklist_items
     SET ${sets.join(", ")}
     WHERE id = $${i} AND template_id = $${i + 1}
     RETURNING *`,
    params
  );
  return rows[0] || null;
}

export async function deleteChecklistItemInTemplate(templateId, id) {
  const { rows } = await pool.query(
    `DELETE FROM checklist_items
     WHERE id = $1 AND template_id = $2
     RETURNING id`,
    [id, templateId]
  );
  return rows[0] || null;
}