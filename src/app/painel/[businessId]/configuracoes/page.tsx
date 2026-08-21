"use client";

import { use, useEffect, useState, useCallback } from "react";
import { BUSINESS_PALETTES } from "@/lib/palettes";
import { ImageUploader } from "@/components/image-uploader";

type Business = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string | null;
  confirmationMode: "AUTOMATIC" | "MANUAL";
  primaryColor: string;
  whatsapp: string | null;
  instagram: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  minLeadMinutes: number;
  maxLeadDays: number;
  cancellationHours: number;
};

type BusinessHour = { weekday: number; startTime: string; endTime: string };
type Professional = { id: string; name: string; active: boolean; specialties: string[]; photoUrl: string | null };
type ServiceCategory = { id: string; name: string; order: number };
type Service = {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  categoryId: string | null;
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
  batchId: string | null;
};

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
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
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceCategoryId, setServiceCategoryId] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDuration, setServiceDuration] = useState("60");
  const [serviceProfessionalIds, setServiceProfessionalIds] = useState<string[]>([]);
  const [savingService, setSavingService] = useState(false);

  const [categoryName, setCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");

  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editServiceName, setEditServiceName] = useState("");
  const [editServiceDescription, setEditServiceDescription] = useState("");
  const [editServiceCategoryId, setEditServiceCategoryId] = useState("");
  const [editServicePrice, setEditServicePrice] = useState("");
  const [editServiceDuration, setEditServiceDuration] = useState("");
  const [editServiceProfessionalIds, setEditServiceProfessionalIds] = useState<string[]>([]);
  const [editServicePhotoUrl, setEditServicePhotoUrl] = useState<string | null>(null);
  const [savingServiceEdit, setSavingServiceEdit] = useState(false);

  const [blocks, setBlocks] = useState<BlockedPeriod[]>([]);
  const [blockProfessionalId, setBlockProfessionalId] = useState("");
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [savingBlock, setSavingBlock] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurStartDate, setRecurStartDate] = useState("");
  const [recurEndDate, setRecurEndDate] = useState("");
  const [recurDays, setRecurDays] = useState<number[]>([]);
  const [recurStartTime, setRecurStartTime] = useState("12:00");
  const [recurEndTime, setRecurEndTime] = useState("13:00");

  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editProfessionalId, setEditProfessionalId] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editReason, setEditReason] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [businessRes, hoursRes, professionalsRes, servicesRes, blocksRes, categoriesRes] = await Promise.all([
      fetch(`/api/painel/business?businessId=${businessId}`),
      fetch(`/api/painel/business-hours?businessId=${businessId}`),
      fetch(`/api/painel/professionals?businessId=${businessId}`),
      fetch(`/api/painel/services?businessId=${businessId}`),
      fetch(`/api/painel/blocked-periods?businessId=${businessId}`),
      fetch(`/api/painel/service-categories?businessId=${businessId}`),
    ]);
    const businessData = await businessRes.json();
    const hoursData = await hoursRes.json();
    const professionalsData = await professionalsRes.json();
    const servicesData = await servicesRes.json();
    const blocksData = await blocksRes.json();
    const categoriesData = await categoriesRes.json();

    setBusiness(businessData.business);
    setProfessionals(professionalsData.professionals ?? []);
    setServices(servicesData.services ?? []);
    setBlocks(blocksData.blocks ?? []);
    setCategories(categoriesData.categories ?? []);

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
        description: business.description,
        address: business.address,
        confirmationMode: business.confirmationMode,
        whatsapp: business.whatsapp,
        instagram: business.instagram,
        primaryColor: business.primaryColor,
        minLeadMinutes: business.minLeadMinutes,
        maxLeadDays: business.maxLeadDays,
        cancellationHours: business.cancellationHours,
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
        description: serviceDescription || undefined,
        categoryId: serviceCategoryId || undefined,
        priceCents: Math.round(parseFloat(servicePrice.replace(",", ".")) * 100),
        durationMin: parseInt(serviceDuration, 10),
        professionalIds: serviceProfessionalIds,
      }),
    });
    setServiceName("");
    setServiceDescription("");
    setServiceCategoryId("");
    setServicePrice("");
    setServiceDuration("60");
    setServiceProfessionalIds([]);
    await load();
    setSavingService(false);
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setSavingCategory(true);
    await fetch("/api/painel/service-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, name: categoryName }),
    });
    setCategoryName("");
    await load();
    setSavingCategory(false);
  }

  function startEditCategory(c: ServiceCategory) {
    setEditingCategoryId(c.id);
    setEditCategoryName(c.name);
  }

  async function saveEditCategory(id: string) {
    if (!editCategoryName.trim()) return;
    await fetch(`/api/painel/service-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, name: editCategoryName }),
    });
    setEditingCategoryId(null);
    await load();
  }

  async function deleteCategory(id: string) {
    await fetch(`/api/painel/service-categories/${id}?businessId=${businessId}`, { method: "DELETE" });
    await load();
  }

  function startEditService(s: Service) {
    setEditingServiceId(s.id);
    setEditServiceName(s.name);
    setEditServiceDescription(s.description ?? "");
    setEditServiceCategoryId(s.categoryId ?? "");
    setEditServicePrice((s.priceCents / 100).toFixed(2).replace(".", ","));
    setEditServiceDuration(String(s.durationMin));
    setEditServiceProfessionalIds(s.professionals.map((sp) => sp.professional.id));
    setEditServicePhotoUrl(s.photoUrl);
  }

  function cancelEditService() {
    setEditingServiceId(null);
  }

  async function saveEditService(id: string) {
    if (!editServiceName.trim() || !editServicePrice || !editServiceDuration) return;
    setSavingServiceEdit(true);
    await fetch(`/api/painel/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        name: editServiceName,
        description: editServiceDescription || null,
        categoryId: editServiceCategoryId || null,
        photoUrl: editServicePhotoUrl,
        priceCents: Math.round(parseFloat(editServicePrice.replace(",", ".")) * 100),
        durationMin: parseInt(editServiceDuration, 10),
        professionalIds: editServiceProfessionalIds,
      }),
    });
    setEditingServiceId(null);
    await load();
    setSavingServiceEdit(false);
  }

  async function toggleServiceActive(s: Service) {
    setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)));
    await fetch(`/api/painel/services/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, active: !s.active }),
    });
  }

  async function addBlock(e: React.FormEvent) {
    e.preventDefault();
    setBlockError(null);

    if (isRecurring) {
      if (!recurStartDate || !recurEndDate || recurDays.length === 0) {
        setBlockError("Preencha as datas e escolha pelo menos um dia da semana.");
        return;
      }
      if (recurEndTime <= recurStartTime) {
        setBlockError("O fim precisa ser depois do início.");
        return;
      }

      // calcula os instantes aqui no navegador — é ele que sabe o fuso horário
      // real de quem está preenchendo o formulário (o servidor não tem por que
      // rodar no mesmo fuso do salão).
      const daySet = new Set(recurDays);
      const occurrences: { startAt: string; endAt: string }[] = [];
      const cursor = new Date(`${recurStartDate}T00:00:00`);
      const end = new Date(`${recurEndDate}T00:00:00`);
      while (cursor <= end && occurrences.length <= 366) {
        if (daySet.has(cursor.getDay())) {
          const y = cursor.getFullYear();
          const m = String(cursor.getMonth() + 1).padStart(2, "0");
          const d = String(cursor.getDate()).padStart(2, "0");
          occurrences.push({
            startAt: new Date(`${y}-${m}-${d}T${recurStartTime}:00`).toISOString(),
            endAt: new Date(`${y}-${m}-${d}T${recurEndTime}:00`).toISOString(),
          });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      if (occurrences.length === 0) {
        setBlockError("Nenhum dia da semana escolhido cai nesse período.");
        return;
      }
      if (occurrences.length > 366) {
        setBlockError("Esse período gera mais de 366 bloqueios. Reduza o intervalo.");
        return;
      }

      setSavingBlock(true);
      const res = await fetch("/api/painel/blocked-periods/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          professionalId: blockProfessionalId || undefined,
          occurrences,
          reason: blockReason || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBlockError(data.error ?? "Não foi possível salvar o bloqueio recorrente.");
        setSavingBlock(false);
        return;
      }
      setBlockProfessionalId("");
      setRecurStartDate("");
      setRecurEndDate("");
      setRecurDays([]);
      setBlockReason("");
      await load();
      setSavingBlock(false);
      return;
    }

    if (!blockStart || !blockEnd) return;
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

  function toggleRecurDay(day: number) {
    setRecurDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  async function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    await fetch(`/api/painel/blocked-periods/${id}?businessId=${businessId}`, { method: "DELETE" });
  }

  async function removeBatch(batchId: string) {
    setBlocks((prev) => prev.filter((b) => b.batchId !== batchId));
    await fetch(`/api/painel/blocked-periods/batch/${batchId}?businessId=${businessId}`, { method: "DELETE" });
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

  type BlockGroup =
    | { type: "single"; block: BlockedPeriod }
    | { type: "batch"; batchId: string; items: BlockedPeriod[] };

  const blockGroups: BlockGroup[] = [];
  const seenBatches = new Set<string>();
  for (const b of blocks) {
    if (!b.batchId) {
      blockGroups.push({ type: "single", block: b });
      continue;
    }
    if (seenBatches.has(b.batchId)) continue;
    seenBatches.add(b.batchId);
    blockGroups.push({ type: "batch", batchId: b.batchId, items: blocks.filter((x) => x.batchId === b.batchId) });
  }

  function formatBatchSummary(items: BlockedPeriod[]) {
    const sorted = [...items].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const days = Array.from(new Set(sorted.map((i) => new Date(i.startAt).getDay()))).sort();
    const dayLabels = days.map((d) => WEEKDAY_SHORT[d]).join(", ");
    const timeFmt: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
    const dateFmt: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit" };
    const time = `${new Date(first.startAt).toLocaleTimeString("pt-BR", timeFmt)} às ${new Date(first.endAt).toLocaleTimeString("pt-BR", timeFmt)}`;
    const range = `${new Date(first.startAt).toLocaleDateString("pt-BR", dateFmt)} até ${new Date(last.startAt).toLocaleDateString("pt-BR", dateFmt)}`;
    return `${dayLabels} · ${time} · ${range} (${items.length}x)`;
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
        <h2 className="text-sm font-semibold text-zinc-900">Categorias de serviço</h2>
        <p className="text-xs text-zinc-500">Agrupe seus serviços — ex: Cabelo, Unhas, Estética. Opcional.</p>

        <form onSubmit={addCategory} className="flex gap-2">
          <input
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="Nome da categoria"
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={savingCategory}
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
          >
            Adicionar
          </button>
        </form>

        {categories.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {categories.map((c) =>
              editingCategoryId === c.id ? (
                <li key={c.id} className="flex items-center gap-1">
                  <input
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    className="w-32 rounded-lg border border-accent px-2 py-1 text-xs outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => saveEditCategory(c.id)}
                    className="rounded-lg bg-accent px-2 py-1 text-xs font-medium text-accent-foreground"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditingCategoryId(null)}
                    className="rounded-lg border border-zinc-300 px-2 py-1 text-xs"
                  >
                    Cancelar
                  </button>
                </li>
              ) : (
                <li
                  key={c.id}
                  className="flex items-center gap-1 rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700"
                >
                  {c.name}
                  <button onClick={() => startEditCategory(c)} className="text-zinc-400 hover:text-zinc-700">
                    editar
                  </button>
                  <button onClick={() => deleteCategory(c.id)} className="text-zinc-400 hover:text-red-600">
                    ×
                  </button>
                </li>
              )
            )}
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
          <textarea
            value={serviceDescription}
            onChange={(e) => setServiceDescription(e.target.value)}
            placeholder="Descrição (opcional) — aparece pro cliente na hora de agendar"
            rows={2}
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

          {categories.length > 0 && (
            <select
              value={serviceCategoryId}
              onChange={(e) => setServiceCategoryId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

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
            {services.map((s) =>
              editingServiceId === s.id ? (
                <li key={s.id} className="col-span-full space-y-2 rounded-lg border border-accent bg-accent/5 p-3">
                  <div className="flex gap-3">
                    <ImageUploader
                      businessId={businessId}
                      currentUrl={editServicePhotoUrl}
                      onUploaded={(url) => setEditServicePhotoUrl(url)}
                      shape="square"
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <input
                        value={editServiceName}
                        onChange={(e) => setEditServiceName(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
                      />
                      <textarea
                        value={editServiceDescription}
                        onChange={(e) => setEditServiceDescription(e.target.value)}
                        placeholder="Descrição (opcional)"
                        rows={2}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={editServicePrice}
                      onChange={(e) => setEditServicePrice(e.target.value)}
                      placeholder="Preço (R$)"
                      className="w-1/2 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                    <input
                      value={editServiceDuration}
                      onChange={(e) => setEditServiceDuration(e.target.value)}
                      type="number"
                      placeholder="Duração (min)"
                      className="w-1/2 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                  </div>
                  {categories.length > 0 && (
                    <select
                      value={editServiceCategoryId}
                      onChange={(e) => setEditServiceCategoryId(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
                    >
                      <option value="">Sem categoria</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {professionals.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {professionals.map((p) => (
                        <label
                          key={p.id}
                          className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                            editServiceProfessionalIds.includes(p.id)
                              ? "border-accent bg-accent/10 text-accent"
                              : "border-zinc-300 text-zinc-600"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={editServiceProfessionalIds.includes(p.id)}
                            onChange={(e) =>
                              setEditServiceProfessionalIds((prev) =>
                                e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                              )
                            }
                          />
                          {p.name}
                        </label>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEditService(s.id)}
                      disabled={savingServiceEdit}
                      className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
                    >
                      {savingServiceEdit ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                      onClick={cancelEditService}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100"
                    >
                      Cancelar
                    </button>
                  </div>
                </li>
              ) : (
                <li key={s.id} className={`rounded-lg border border-zinc-200 px-3 py-2 ${!s.active ? "opacity-60" : ""}`}>
                  <div className="flex items-start gap-2">
                    {s.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.photoUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900">
                        {s.name} {!s.active && <span className="text-xs font-normal text-zinc-500">(inativo)</span>}
                      </p>
                      <p className="text-sm text-zinc-600">
                        {formatBRL(s.priceCents)} · {s.durationMin}min
                      </p>
                      {s.description && <p className="mt-1 text-xs text-zinc-500">{s.description}</p>}
                      <p className="mt-1 text-xs text-zinc-500">
                        {s.professionals.map((sp) => sp.professional.name).join(", ") || "Sem profissional vinculado"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => startEditService(s)}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => toggleServiceActive(s)}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100"
                    >
                      {s.active ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                </li>
              )
            )}
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
          <label className="text-sm font-medium text-zinc-700">Descrição</label>
          <textarea
            value={business.description ?? ""}
            onChange={(e) => setBusiness({ ...business, description: e.target.value })}
            placeholder="Uma frase sobre o seu salão — aparece na página pública"
            rows={2}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Endereço</label>
          <input
            value={business.address ?? ""}
            onChange={(e) => setBusiness({ ...business, address: e.target.value })}
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700">Antecedência mínima (min)</label>
            <input
              type="number"
              min={0}
              value={business.minLeadMinutes}
              onChange={(e) => setBusiness({ ...business, minLeadMinutes: Number(e.target.value) })}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <p className="text-xs text-zinc-500">Cliente só agenda com esse tempo de antecedência.</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700">Antecedência máxima (dias)</label>
            <input
              type="number"
              min={1}
              value={business.maxLeadDays}
              onChange={(e) => setBusiness({ ...business, maxLeadDays: Number(e.target.value) })}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <p className="text-xs text-zinc-500">Até quantos dias no futuro dá pra agendar.</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700">Cancelamento (horas)</label>
            <input
              type="number"
              min={0}
              value={business.cancellationHours}
              onChange={(e) => setBusiness({ ...business, cancellationHours: Number(e.target.value) })}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <p className="text-xs text-zinc-500">Prazo mínimo pro cliente cancelar sozinho.</p>
          </div>
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

          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
            Repetir toda semana (ex: horário de almoço)
          </label>

          {isRecurring ? (
            <>
              <div className="flex flex-wrap gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <label className="text-xs font-medium text-zinc-600">De</label>
                  <input
                    type="date"
                    value={recurStartDate}
                    onChange={(e) => setRecurStartDate(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <label className="text-xs font-medium text-zinc-600">Até</label>
                  <input
                    type="date"
                    value={recurEndDate}
                    onChange={(e) => setRecurEndDate(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-600">Dias da semana</p>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_SHORT.map((label, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleRecurDay(i)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        recurDays.includes(i)
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-zinc-300 text-zinc-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <label className="text-xs font-medium text-zinc-600">Das</label>
                  <input
                    type="time"
                    value={recurStartTime}
                    onChange={(e) => setRecurStartTime(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <label className="text-xs font-medium text-zinc-600">Às</label>
                  <input
                    type="time"
                    value={recurEndTime}
                    onChange={(e) => setRecurEndTime(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>
              </div>
            </>
          ) : (
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
          )}

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
            {blockGroups.map((group) =>
              group.type === "batch" ? (
                <li
                  key={group.batchId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">Recorrente · {formatBatchSummary(group.items)}</p>
                    <p className="text-xs text-zinc-500">
                      {group.items[0].professionalId
                        ? professionals.find((p) => p.id === group.items[0].professionalId)?.name ?? "Profissional"
                        : "Todo o negócio"}
                      {group.items[0].reason ? ` · ${group.items[0].reason}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => removeBatch(group.batchId)}
                    className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100"
                  >
                    Remover todos
                  </button>
                </li>
              ) : (() => {
                const b = group.block;
                return editingBlockId === b.id ? (
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
              );
              })()
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
