import * as bcrypt from 'bcrypt';

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(oldPass: string, pass: string) {
  return await bcrypt.compare(oldPass, pass);
}
