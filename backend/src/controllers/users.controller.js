import { z } from "zod";
import { hashPassword } from "../utils/password.js";
import { getRoleByCode } from "../models/roles.model.js";
import { createUser, listUsers, setUserActive, findUserById } from "../models/users.model.js";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  roleCode: z.enum(["ADMIN", "STAFF", "OFFICE"]),
  officeId: z.string().uuid().nullable().optional(),
});

export async function createUserHandler(req, res) {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });

  const { email, password, fullName, roleCode, officeId } = parsed.data;

  if (roleCode === "OFFICE" && !officeId) {
    return res.status(400).json({ message: "OFFICE users must have officeId" });
  }

  const role = await getRoleByCode(roleCode);
  if (!role) return res.status(400).json({ message: "Role not found" });

  const passwordHash = await hashPassword(password);

  const user = await createUser({
    email,
    passwordHash,
    fullName,
    roleId: role.id,
    officeId: roleCode === "OFFICE" ? officeId : (officeId ?? null),
  });

  return res.status(201).json({ user });
}

export async function listUsersHandler(req, res) {
  const users = await listUsers();
  return res.json({ users });
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