// Temas profissionais prontos (seção 7 do plano) — cobrindo estilos bem diferentes
// pra caber em qualquer tipo de negócio (salão, barbearia, clínica de estética,
// spa, etc), não só o vermelho/preto da identidade da própria Bat Hub.
export const BUSINESS_PALETTES = [
  { id: "rose", name: "Rosé", color: "#B76E79" },
  { id: "terracota", name: "Terracota", color: "#C1663B" },
  { id: "champagne", name: "Champagne", color: "#A67C43" },
  { id: "sálvia", name: "Verde Sálvia", color: "#6B8F71" },
  { id: "esmeralda", name: "Esmeralda", color: "#276749" },
  { id: "petróleo", name: "Azul Petróleo", color: "#1F6F78" },
  { id: "marinho", name: "Azul Marinho", color: "#2C3E63" },
  { id: "lavanda", name: "Lavanda", color: "#7C6BA8" },
  { id: "ameixa", name: "Ameixa", color: "#7A3B69" },
  { id: "borgonha", name: "Borgonha", color: "#7C2D3B" },
  { id: "âmbar", name: "Âmbar", color: "#B8860B" },
  { id: "grafite", name: "Grafite", color: "#33363B" },
] as const;

// Luminância relativa (WCAG) pra decidir se o texto em cima da cor escolhida
// deve ser branco ou escuro — evita botão ilegível se o salão escolher uma cor clara.
export function getReadableTextColor(hex: string): "#ffffff" | "#111111" {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#ffffff";
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.55 ? "#111111" : "#ffffff";
}
