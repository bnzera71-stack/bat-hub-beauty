"use client";

import { use, useEffect, useState, useCallback } from "react";
import { BUSINESS_PALETTES } from "@/lib/palettes";
import { ImageUploader } from "@/components/image-uploader";

type Business = {
  id: string;
  slug: string;
  name: string;
  confirmationMode: "AUTOMATIC" | "MANUAL";
  primaryColor: string;
  whatsapp: string | null;
  instagram: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
};

type BusinessHour = { weekday: number; startTime: string; endTime: string };
type Professional = { id: string; name: string; active: boolean; specialties: string[]; photoUrl: string | null };
type Service = {
  id: string;
  name: string;
  priceCents: number;
  durationMin: number;
  active: boolean;
  professionals: { professional: Professional }[];
};
type BlockedPeriod = {
  id: string;
  professionalId: string | null;
  startAt: string;
  endAt: string;
  reason: string | null;
};

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ConfiguracoesPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);
  const [business, setBusiness] = useState<Business | null>(null);
  const [hours, setHours] = useState<Record<number, { open: boolean; startTime: string; endTime: string }>>(
    {}
  );
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugInput, setSlugInput] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [savingSlug, setSavingSlug] = useState(false);

  const [professionalName, setProfessionalName] = useState("");
  const [savingProfessional, setSavingProfessional] = useState(false);

  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDuration, setServiceDuration] = useState("60");
  const [serviceProfessionalIds, setServiceProfessionalIds] = useState<string[]>([]);
  const [savingService, setSavingService] = useState(false);

  const [blocks, setBlocks] = useState<BlockedPeriod[]>([]);
  const [blockProfessionalId, setBlockProfessionalId] = useState("");
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [savingBlock, setSavingBlock] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editProfessionalId, setEditProfessionalId] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editReason, setEditReason] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [businessRes, hoursRes, professionalsRes, servicesRes, blocksRes] = await Promise.all([
      fetch(`/api/painel/business?businessId=${businessId}`),
      fetch(`/api/painel/business-hours?businessId=${businessId}`),
      fetch(`/api/painel/professionals?businessId=${businessId}`),
      fetch(`/api/painel/services?businessId=${businessId}`),
      fetch(`/api/painel/blocked-periods?businessId=${businessId}`),
    ]);
    const businessData = await businessRes.json();
    const hoursData = await hoursRes.json();
    const professionalsData = await professionalsRes.json();
    const servicesData = await servicesRes.json();
    const blocksData = await blocksRes.json();

    setBusiness(businessData.business);
    setProfessionals(professionalsData.professionals ?? []);
    setServices(servicesData.services ?? []);
    setBlocks(blocksData.blocks ?? []);

    const map: Record<number, { open: boolean; startTime: string; endTime: string }> = {};
    for (let i = 0; i < 7; i++) map[i] = { open: false, startTime: "09:00", endTime: "18:00" };
    for (const h of hoursData.hours as BusinessHour[]) {
      map[h.weekday] = { open: true, startTime: h.startTime, endTime: h.endTime };
    }
    setHours(map);
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveBusiness() {
    if (!business) return;
    setSaving(true);
    await fetch("/api/painel/business", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        name: business.name,
        confirmationMode: business.confirmationMode,
        whatsapp: business.whatsapp,
        instagram: business.instagram,
        primaryColor: business.primaryColor,
      }),
    });
    setSaving(false);
  }

  async function saveHours() {
    setSaving(true);
    const payload = Object.entries(hours)
      .filter(([, v]) => v.open)
      .map(([weekday, v]) => ({ weekday: Number(weekday), startTime: v.startTime, endTime: v.endTime }));
    await fetch("/api/painel/business-hours", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, hours: payload }),
    });
    setSaving(false);
  }

  function copyLink() {
    if (!business) return;
    navigator.clipboard.writeText(`${window.location.origin}/${business.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function saveSlug() {
    if (!business) return;
    setSavingSlug(true);
    setSlugError(null);
    const res = await fetch("/api/painel/business", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, slug: slugInput }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSlugError(data.error ?? "Não foi possível salvar.");
      setSavingSlug(false);
      return;
    }
    setBusiness(data.business);
    setEditingSlug(false);
    setSavingSlug(false);
  }

  async function saveBusinessField(field: "logoUrl" | "coverUrl", url: string) {
    if (!business) return;
    setBusiness({ ...business, [field]: url });
    await fetch("/api/painel/business", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, [field]: url }),
    });
  }

  async function saveProfessionalPhoto(professionalId: string, url: string) {
    setProfessionals((prev) => prev.map((p) => (p.id === professionalId ? { ...p, photoUrl: url } : p)));
    await fetch(`/api/painel/professionals/${professionalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, photoUrl: url }),
    });
  }

  async function addProfessional(e: React.FormEvent) {
    e.preventDefault();
    if (!professionalName.trim()) return;
    setSavingProfessional(true);
    await fetch("/api/painel/professionals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, name: professionalName, specialties: [] }),
    });
    setProfessionalName("");
    await load();
    setSavingProfessional(false);
  }

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceName.trim() || !servicePrice || !serviceDuration) return;
    setSavingService(true);
    await fetch("/api/painel/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        name: serviceName,
        priceCents: Math.round(parseFloat(servicePrice.replace(",", ".")) * 100),
        durationMin: parseInt(serviceDuration, 10),
        professionalIds: serviceProfessionalIds,
      }),
    });
    setServiceName("");
    setServicePrice("");
    setServiceDuration("60");
    setServiceProfessionalIds([]);
    await load();
    setSavingService(false);
  }

  async function addBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!blockStart || !blockEnd) return;
    setBlockError(null);
    const startAt = new Date(blockStart);
    const endAt = new Date(blockEnd);
    if (endAt <= startAt) {
      setBlockError("O fim precisa ser depois do início.");
      return;
    }
    setSavingBlock(true);
    const res = await fetch("/api/painel/blocked-periods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        professionalId: blockProfessionalId || undefined,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        reason: blockReason || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setBlockError(data.error ?? "Não foi possível salvar o bloqueio.");
      setSavingBlock(false);
      return;
    }
    setBlockProfessionalId("");
    setBlockStart("");
    setBlockEnd("");
    setBlockReason("");
    await load();
    setSavingBlock(false);
  }

  async function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    await fetch(`/api/painel/blocked-periods/${id}?businessId=${businessId}`, { method: "DELETE" });
  }

  function toDatetimeLocal(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function startEditBlock(b: BlockedPeriod) {
    setEditingBlockId(b.id);
    setEditProfessionalId(b.professionalId ?? "");
    setEditStart(toDatetimeLocal(b.startAt));
    setEditEnd(toDatetimeLocal(b.endAt));
    setEditReason(b.reason ?? "");
    setEditError(null);
  }

  function cancelEditBlock() {
    setEditingBlockId(null);
    setEditError(null);
  }

  async function saveEditBlock(id: string) {
    if (!editStart || !editEnd) return;
    const startAt = new Date(editStart);
    const endAt = new Date(editEnd);
    if (endAt <= startAt) {
      setEditError("O fim precisa ser depois do início.");
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    const res = await fetch(`/api/painel/blocked-periods/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        professionalId: editProfessionalId || null,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        reason: editReason || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setEditError(data.error ?? "Não foi possível salvar.");
      setSavingEdit(false);
      return;
    }
    setEditingBlockId(null);
    await load();
    setSavingEdit(false);
  }

  function formatBlockRange(startAt: string, endAt: string) {
    const start = new Date(startAt);
    const end = new Date(endAt);
    const sameDay = start.toDateString() === end.toDateString();
    const dateFmt: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit" };
    const timeFmt: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
    if (sameDay) {
      return `${start.toLocaleDateString("pt-BR", dateFmt)} · ${start.toLocaleTimeString("pt-BR", timeFmt)} às ${end.toLocaleTimeString("pt-BR", timeFmt)}`;
    }
    return `${start.toLocaleDateString("pt-BR", dateFmt)} ${start.toLocaleTimeString("pt-BR", timeFmt)} até ${end.toLocaleDateString("pt-BR", dateFmt)} ${end.toLocaleTimeString("pt-BR", timeFmt)}`;
  }

  if (loading || !business) return <p className="text-sm text-zinc-500">Carregando...</p>;

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Agenda online</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Tudo que você configurar aqui atualiza na hora no seu link de agendamento.
        </p>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Seu link de agendamento</h2>
        {!editingSlug ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-zinc-100 px-3 py-2 text-sm">
              {typeof window !== "undefined" ? window.location.origin : ""}/{business.slug}
            </code>
            <button
              onClick={copyLink}
              className="shrink-0 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100"
            >
              {copied ? "Copiado!" : "Copiar"}
            </button>
            <button
              onClick={() => {
                setSlugInput(business.slug);
                setSlugError(null);
                setEditingSlug(true);
              }}
              className="shrink-0 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100"
            >
              Editar
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center rounded-lg border border-zinc-300 px-3 py-2 focus-within:border-accent">
              <span className="shrink-0 text-sm text-zinc-500">
                {typeof window !== "undefined" ? window.location.origin : ""}/
              </span>
              <input
                value={slugInput}
                onChange={(e) =>
                  setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                }
                className="min-w-0 flex-1 outline-none"
              />
            </div>
            {slugError && <p className="text-sm text-red-600">{slugError}</p>}
            <div className="flex gap-2">
              <button
                onClick={saveSlug}
                disabled={savingSlug}
                className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
              >
                {savingSlug ? "Salvando..." : "Salvar link"}
              </button>
              <button
                onClick={() => setEditingSlug(false)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Aparência da página pública</h2>

        <div className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-600">Logo</p>
            <ImageUploader
              businessId={businessId}
              currentUrl={business.logoUrl}
              onUploaded={(url) => saveBusinessField("logoUrl", url)}
              shape="square"
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-medium text-zinc-600">Foto de capa</p>
            <ImageUploader
              businessId={businessId}
              currentUrl={business.coverUrl}
              onUploaded={(url) => saveBusinessField("coverUrl", url)}
              shape="wide"
            />
          </div>
        </div>

        <p className="text-xs text-zinc-500">
          Essa cor aparece na sua página de agendamento — escolha algo que combine com o seu negócio.
        </p>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
          {BUSINESS_PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.name}
              onClick={() => setBusiness({ ...business, primaryColor: p.color })}
              className={`h-9 w-9 rounded-full border-2 ${
                business.primaryColor.toLowerCase() === p.color.toLowerCase()
                  ? "border-zinc-900"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: p.color }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={business.primaryColor}
            onChange={(e) => setBusiness({ ...business, primaryColor: e.target.value })}
            className="h-9 w-9 cursor-pointer rounded-lg border border-zinc-300 p-0.5"
          />
          <span className="text-xs text-zinc-500">ou escolha uma cor personalizada</span>
        </div>
        <button
          onClick={saveBusiness}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: business.primaryColor }}
        >
          Salvar cor
        </button>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Profissionais</h2>
        <p className="text-xs text-zinc-500">Quem atende no seu salão — aparece na hora de escolher na página pública.</p>

        <form onSubmit={addProfessional} className="flex gap-2">
          <input
            value={professionalName}
            onChange={(e) => setProfessionalName(e.target.value)}
            placeholder="Nome do profissional"
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={savingProfessional}
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
          >
            Adicionar
          </button>
        </form>

        {professionals.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum profissional cadastrado ainda.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {professionals.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2">
                <div className="shrink-0">
                  <ImageUploader
                    businessId={businessId}
                    currentUrl={p.photoUrl}
                    onUploaded={(url) => saveProfessionalPhoto(p.id, url)}
                    shape="square"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">{p.name}</p>
                  {!p.active && <p className="text-xs text-zinc-500">Inativo</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Serviços</h2>
        <p className="text-xs text-zinc-500">O que o seu salão oferece, com preço e duração.</p>

        <form onSubmit={addService} className="space-y-3">
          <input
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            placeholder="Nome do serviço"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <input
              value={servicePrice}
              onChange={(e) => setServicePrice(e.target.value)}
              placeholder="Preço (R$)"
              className="w-1/2 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <input
              value={serviceDuration}
              onChange={(e) => setServiceDuration(e.target.value)}
              type="number"
              placeholder="Duração (min)"
              className="w-1/2 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          {professionals.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-zinc-600">Quem pode atender</p>
              <div className="flex flex-wrap gap-2">
                {professionals.map((p) => (
                  <label
                    key={p.id}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                      serviceProfessionalIds.includes(p.id)
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-zinc-300 text-zinc-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={serviceProfessionalIds.includes(p.id)}
                      onChange={(e) =>
                        setServiceProfessionalIds((prev) =>
                          e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                        )
                      }
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={savingService}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
          >
            Adicionar serviço
          </button>
        </form>

        {services.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum serviço cadastrado ainda.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {services.map((s) => (
              <li key={s.id} className="rounded-lg border border-zinc-200 px-3 py-2">
                <p className="text-sm font-medium text-zinc-900">{s.name}</p>
                <p className="text-sm text-zinc-600">
                  {formatBRL(s.priceCents)} · {s.durationMin}min
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {s.professionals.map((sp) => sp.professional.name).join(", ") || "Sem profissional vinculado"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Negócio</h2>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Nome</label>
          <input
            value={business.name}
            onChange={(e) => setBusiness({ ...business, name: e.target.value })}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">WhatsApp</label>
          <input
            value={business.whatsapp ?? ""}
            onChange={(e) => setBusiness({ ...business, whatsapp: e.target.value })}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Instagram</label>
          <input
            value={business.instagram ?? ""}
            onChange={(e) => setBusiness({ ...business, instagram: e.target.value })}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Confirmação de agendamento</label>
          <select
            value={business.confirmationMode}
            onChange={(e) =>
              setBusiness({ ...business, confirmationMode: e.target.value as "AUTOMATIC" | "MANUAL" })
            }
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="MANUAL">Manual (você aprova cada agendamento)</option>
            <option value="AUTOMATIC">Automática (confirma sozinho)</option>
          </select>
        </div>
        <button
          onClick={saveBusiness}
          disabled={saving}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
        >
          Salvar
        </button>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Horário de funcionamento</h2>
        {WEEKDAYS.map((label, i) => (
          <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <label className="flex w-24 shrink-0 items-center gap-2 text-sm sm:w-32">
              <input
                type="checkbox"
                checked={hours[i]?.open ?? false}
                onChange={(e) =>
                  setHours({ ...hours, [i]: { ...hours[i], open: e.target.checked } })
                }
              />
              {label}
            </label>
            {hours[i]?.open && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="time"
                  value={hours[i].startTime}
                  onChange={(e) =>
                    setHours({ ...hours, [i]: { ...hours[i], startTime: e.target.value } })
                  }
                  className="min-w-0 rounded-lg border border-zinc-300 px-2 py-1 text-sm"
                />
                <span className="text-sm text-zinc-500">até</span>
                <input
                  type="time"
                  value={hours[i].endTime}
                  onChange={(e) =>
                    setHours({ ...hours, [i]: { ...hours[i], endTime: e.target.value } })
                  }
                  className="min-w-0 rounded-lg border border-zinc-300 px-2 py-1 text-sm"
                />
              </div>
            )}
          </div>
        ))}
        <button
          onClick={saveHours}
          disabled={saving}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
        >
          Salvar horários
        </button>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Bloqueios e férias</h2>
        <p className="text-xs text-zinc-500">
          Bloqueia um período pra não deixar ninguém agendar — folga, férias, feriado. Escolha "Todo o negócio" pra
          fechar o salão inteiro, ou um profissional específico.
        </p>

        <form onSubmit={addBlock} className="space-y-3">
          {professionals.length > 0 && (
            <select
              value={blockProfessionalId}
              onChange={(e) => setBlockProfessionalId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="">Todo o negócio</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  Só {p.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex flex-wrap gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <label className="text-xs font-medium text-zinc-600">Início</label>
              <input
                type="datetime-local"
                value={blockStart}
                onChange={(e) => setBlockStart(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <label className="text-xs font-medium text-zinc-600">Fim</label>
              <input
                type="datetime-local"
                value={blockEnd}
                onChange={(e) => setBlockEnd(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
          </div>
          <input
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            placeholder="Motivo (opcional) — ex: Férias"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          {blockError && <p className="text-sm text-red-600">{blockError}</p>}
          <button
            type="submit"
            disabled={savingBlock}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
          >
            {savingBlock ? "Salvando..." : "Adicionar bloqueio"}
          </button>
        </form>

        {blocks.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum bloqueio cadastrado.</p>
        ) : (
          <ul className="space-y-2">
            {blocks.map((b) =>
              editingBlockId === b.id ? (
                <li key={b.id} className="space-y-2 rounded-lg border border-accent bg-accent/5 px-3 py-3">
                  {professionals.length > 0 && (
                    <select
                      value={editProfessionalId}
                      onChange={(e) => setEditProfessionalId(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
                    >
                      <option value="">Todo o negócio</option>
                      {professionals.map((p) => (
                        <option key={p.id} value={p.id}>
                          Só {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <label className="text-xs font-medium text-zinc-600">Início</label>
                      <input
                        type="datetime-local"
                        value={editStart}
                        onChange={(e) => setEditStart(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <label className="text-xs font-medium text-zinc-600">Fim</label>
                      <input
                        type="datetime-local"
                        value={editEnd}
                        onChange={(e) => setEditEnd(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                  <input
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="Motivo (opcional)"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                  {editError && <p className="text-sm text-red-600">{editError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEditBlock(b.id)}
                      disabled={savingEdit}
                      className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
                    >
                      {savingEdit ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                      onClick={cancelEditBlock}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100"
                    >
                      Cancelar
                    </button>
                  </div>
                </li>
              ) : (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{formatBlockRange(b.startAt, b.endAt)}</p>
                    <p className="text-xs text-zinc-500">
                      {b.professionalId
                        ? professionals.find((p) => p.id === b.professionalId)?.name ?? "Profissional"
                        : "Todo o negócio"}
                      {b.reason ? ` · ${b.reason}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => startEditBlock(b)}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => removeBlock(b.id)}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100"
                    >
                      Remover
                    </button>
                  </div>
                </li>
              )
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
