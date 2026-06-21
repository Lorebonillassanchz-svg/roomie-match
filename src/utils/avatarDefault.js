export function getAvatarDefault(sexo) {
  const mujer = `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="#1e1b2e"/>
      <circle cx="50" cy="35" r="18" fill="#a78bfa"/>
      <path d="M20 85 Q20 58 50 58 Q80 58 80 85" fill="#a78bfa"/>
      <path d="M35 53 Q32 62 28 65 Q40 72 50 70 Q60 72 72 65 Q68 62 65 53" fill="#7c3aed"/>
      <path d="M38 68 Q44 75 50 76 Q56 75 62 68" fill="#9333ea" opacity="0.5"/>
    </svg>`)}`;

  const hombre = `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="#1e1b2e"/>
      <circle cx="50" cy="35" r="18" fill="#f97316"/>
      <path d="M20 85 Q20 58 50 58 Q80 58 80 85" fill="#f97316"/>
      <rect x="33" y="52" width="34" height="8" rx="4" fill="#ea580c"/>
    </svg>`)}`;

  const neutro = `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="#1e1b2e"/>
      <circle cx="50" cy="35" r="18" fill="#7c3aed"/>
      <path d="M20 85 Q20 58 50 58 Q80 58 80 85" fill="#7c3aed"/>
    </svg>`)}`;

  if (sexo === 'mujer') return mujer;
  if (sexo === 'hombre') return hombre;
  return neutro;
}
