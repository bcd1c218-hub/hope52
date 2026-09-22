export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password } = req.body || {};
  const correct = process.env.TEACHER_PASSCODE;

  if (!correct) {
    return res.status(500).json({ error: "서버에 TEACHER_PASSCODE가 설정되어 있지 않아요." });
  }

  if (typeof password === "string" && password === correct) {
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ ok: false, error: "비밀번호가 맞지 않아요." });
}
