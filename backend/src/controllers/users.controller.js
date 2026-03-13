import { z } from "zod";
import { hashPassword } from "../utils/password.js";
import { getRoleByCode } from "../models/roles.model.js";
import { createUser, listUsers, setUserActive, findUserById, updateUser, deleteUser, updateUserPassword } from "../models/users.model.js";
import { getPaginationParams, formatPaginatedResponse } from "../utils/pagination.js";

function generatePassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%^&*";
  const all = upper + lower + digits + special;
  let pwd = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  for (let i = pwd.length; i < 12; i++) {
    pwd.push(all[Math.floor(Math.random() * all.length)]);
  }
  return pwd.sort(() => Math.random() - 0.5).join("");
}

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  fullName: z.string().min(2),
  roleCode: z.enum(["ADMIN", "STAFF", "OFFICE"]),
  officeId: z.string().uuid().nullable().optional(),
});

export async function createUserHandler(req, res) {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });

  const { email, fullName, roleCode, officeId } = parsed.data;
  const rawPassword = parsed.data.password || generatePassword();

  if (roleCode === "OFFICE" && !officeId) {
    return res.status(400).json({ message: "OFFICE users must have officeId" });
  }

  const role = await getRoleByCode(roleCode);
  if (!role) return res.status(400).json({ message: "Role not found" });

  const passwordHash = await hashPassword(rawPassword);

  const user = await createUser({
    email,
    passwordHash,
    fullName,
    roleId: role.id,
    officeId: roleCode === "OFFICE" ? officeId : (officeId ?? null),
  });

  return res.status(201).json({ user, generatedPassword: !parsed.data.password ? rawPassword : undefined });
}

export async function listUsersHandler(req, res) {
  const { limit, offset, page } = getPaginationParams(req, 20, 100);
  const { rows, total } = await listUsers(limit, offset);
  return res.json(formatPaginatedResponse(rows, total, page, limit));
}

export async function setUserActiveHandler(req, res) {
  const id = req.params.id;
  const parsed = z.object({ isActive: z.boolean() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

  const updated = await setUserActive(id, parsed.data.isActive);
  if (!updated) return res.status(404).json({ message: "User not found" });

  return res.json({ user: updated });
}

export async function getUserHandler(req, res) {
  const user = await findUserById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  return res.json({ user });
}

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(2).optional(),
  roleCode: z.enum(["ADMIN", "STAFF", "OFFICE"]).optional(),
  officeId: z.string().uuid().nullable().optional(),
});

export async function updateUserHandler(req, res) {
  const userId = req.params.id;
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });

  const { email, fullName, roleCode, officeId } = parsed.data;
  
  let roleId = undefined;
  if (roleCode) {
    const role = await getRoleByCode(roleCode);
    if (!role) return res.status(400).json({ message: "Role not found" });
    roleId = role.id;
  }

  if (roleCode === "OFFICE" && !officeId) {
    return res.status(400).json({ message: "OFFICE users must have officeId" });
  }

  const updated = await updateUser(userId, {
    email,
    fullName,
    roleId,
    officeId: roleCode === "OFFICE" ? officeId : (officeId ?? undefined),
  });

  if (!updated) return res.status(404).json({ message: "User not found" });
  return res.json({ user: updated });
}

export async function deleteUserHandler(req, res) {
  const userId = req.params.id;
  const deleted = await deleteUser(userId);
  
  if (!deleted) return res.status(404).json({ message: "User not found" });
  return res.json({ message: "User deleted successfully" });
}

export async function resetUserPasswordHandler(req, res) {
  const userId = req.params.id;
  const user = await findUserById(userId);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const rawPassword = generatePassword();
  const passwordHash = await hashPassword(rawPassword);

  const updated = await updateUserPassword(userId, passwordHash);
  if (!updated) {
    return res.status(500).json({ message: "Failed to reset password" });
  }

  // Return the new temporary password so admin can share it with the user
  return res.json({
    generatedPassword: rawPassword,
  });
}