export function officerNumberForUsername(username: string) {
  const normalized = username.trim().toLowerCase();
  if (normalized === "admin") return "101";
  if (normalized === "maxvonb") return "301";
  if (normalized === "rowanc") return "203";
  if (normalized === "killianm") return "304";
  if (normalized === "malcomh") return "404";
  return "OPD";
}

export function officerDisplayName(username: string) {
  const normalized = username.trim().toLowerCase();
  if (normalized === "sistergrimm") return "Devyn Grimm";
  if (normalized === "admin") return "Jacob Grimm";
  if (normalized === "maxvonb") return "Max VonB";
  if (normalized === "rowanc") return "RowanC";
  if (normalized === "killianm") return "KillianM";
  if (normalized === "malcomh") return "MalcomH";
  return username.trim() || "Officer";
}

export function officerIdentity(username: string) {
  return `${officerDisplayName(username)} (#${officerNumberForUsername(username)})`;
}
