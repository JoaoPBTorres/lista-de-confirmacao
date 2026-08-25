export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function familyStatus(fam) {
  const total = fam.members.length;
  const answered = fam.members.filter(m => m.attending === true || m.attending === false).length;
  const yes = fam.members.filter(m => m.attending === true).length;
  const no = fam.members.filter(m => m.attending === false).length;
  if (answered === 0) return 'pending';
  if (answered < total) return 'partial';
  if (yes === total) return 'confirmed';
  if (no === total) return 'declined';
  return 'mixed';
}