import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Mic, MicOff, Paperclip, Send, Smile, X } from "lucide-react";
import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react";
import { api } from "../services/api";
import { agentesService } from "../services/agentes.service";
import type { Agente } from "../types/agente";
import type { ApiResponse } from "../types/api";

// ── helpers ───────────────────────────────────────────────────────────────────

function formatTime(date: Date) {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

interface Mensagem {
  role: "user" | "ai";
  text: string;
  time: Date;
  imagemUrl?: string;
}

// ── Double check (lido) ───────────────────────────────────────────────────────

function DoubleCheck() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 11" fill="none">
      <path d="M11 1L5 9L1 5"  stroke="#53bdeb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 1L9 9"      stroke="#53bdeb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Balão de mensagem ─────────────────────────────────────────────────────────

function Balao({ mensagem, agenteName }: { mensagem: Mensagem; agenteName: string }) {
  const isUser = mensagem.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-[2px]`}>
      <div
        className="relative max-w-[65%] px-[10px] pt-[6px] pb-[4px]"
        style={{
          background:   isUser ? "#005c4b" : "#202c33",
          borderRadius: isUser ? "8px 2px 8px 8px" : "2px 8px 8px 8px",
          minWidth: "80px",
        }}
      >
        {!isUser && (
          <p className="mb-[2px] text-[11px] font-semibold" style={{ color: "#00a884" }}>
            {agenteName}
          </p>
        )}

        {/* Imagem anexada */}
        {mensagem.imagemUrl && (
          <img
            src={mensagem.imagemUrl}
            alt="Imagem enviada"
            className="mb-1.5 max-h-64 w-full rounded-lg object-cover"
          />
        )}

        {/* Texto — preserva quebras de linha */}
        {mensagem.text && (
          <p className="text-[14px] leading-[20px] text-white/95 whitespace-pre-wrap break-words">
            {mensagem.text}
          </p>
        )}

        {/* Hora + check */}
        <div className="flex items-center justify-end gap-[3px] mt-[2px]">
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
            {formatTime(mensagem.time)}
          </span>
          {isUser && <DoubleCheck />}
        </div>
      </div>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-1">
      <div
        className="flex items-center gap-[5px] px-4 py-3"
        style={{ background: "#202c33", borderRadius: "2px 8px 8px 8px" }}
      >
        {[0, 160, 320].map((delay) => (
          <span
            key={delay}
            className="h-[7px] w-[7px] rounded-full animate-bounce"
            style={{ background: "rgba(255,255,255,0.45)", animationDelay: `${delay}ms`, animationDuration: "1s" }}
          />
        ))}
      </div>
    </div>
  );
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex justify-center my-3">
      <span className="rounded-lg px-3 py-[3px] text-[12px]" style={{ background: "#182229", color: "rgba(255,255,255,0.55)" }}>
        {label}
      </span>
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export function TestarAgente() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [mensagem, setMensagem]         = useState("");
  const [chat, setChat]                 = useState<Mensagem[]>([]);
  const [isTyping, setIsTyping]         = useState(false);
  const [showEmoji, setShowEmoji]       = useState(false);
  const [imagemPreview, setImagemPreview] = useState<{ file: File; url: string } | null>(null);
  const [recording, setRecording]       = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const bottomRef      = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const mediaRecRef    = useRef<MediaRecorder | null>(null);
  const audioChunks    = useRef<Blob[]>([]);

  const { data: agente } = useQuery<Agente>({
    queryKey: ["agente", id],
    queryFn:  () => agentesService.get(id as string),
    enabled:  !!id,
  });

  const agenteName = agente?.nome ?? "Agente";

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, isTyping]);

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  // ── Mutation principal (chat) ──────────────────────────────────────────────

  const mutation = useMutation({
    mutationFn: (form: FormData) =>
      api.post<ApiResponse<{ resposta: string }>>(`/agentes/${id}/chat`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      }).then((r) => r.data.data),

    onMutate: (form) => {
      const texto   = form.get("mensagem") as string;
      const imagem  = imagemPreview?.url ?? undefined;
      setChat((prev) => [...prev, { role: "user", text: texto, time: new Date(), imagemUrl: imagem }]);
      setIsTyping(true);
      setMensagem("");
      setImagemPreview(null);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    },
    onSuccess: (data) => {
      setIsTyping(false);
      setChat((prev) => [...prev, { role: "ai", text: data.resposta, time: new Date() }]);
    },
    onError: () => setIsTyping(false),
  });

  // ── Envio ──────────────────────────────────────────────────────────────────

  function enviar() {
    const msg = mensagem.trim();
    if ((!msg && !imagemPreview) || mutation.isPending) return;

    const form = new FormData();
    form.append("mensagem", msg || "Descreva esta imagem.");
    if (imagemPreview) form.append("imagem", imagemPreview.file);

    mutation.mutate(form);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      setMensagem((prev) => prev + "\n");
      setTimeout(resizeTextarea, 0);
    }
  }

  // ── Emoji ──────────────────────────────────────────────────────────────────

  function onEmojiClick(data: EmojiClickData) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? mensagem.length;
    const end   = el?.selectionEnd   ?? mensagem.length;
    const next  = mensagem.slice(0, start) + data.emoji + mensagem.slice(end);
    setMensagem(next);
    setShowEmoji(false);
    setTimeout(() => {
      el?.focus();
      const pos = start + data.emoji.length;
      el?.setSelectionRange(pos, pos);
      resizeTextarea();
    }, 0);
  }

  // ── Imagem ─────────────────────────────────────────────────────────────────

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagemPreview({ file, url: URL.createObjectURL(file) });
    e.target.value = "";
  }

  // ── Áudio (hold to record) ─────────────────────────────────────────────────

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunks.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && audioChunks.current.push(e.data);
      mr.onstop = () => stream.getTracks().forEach((t) => t.stop());
      mr.start(100);
      mediaRecRef.current = mr;
      setRecording(true);
    } catch {
      alert("Permissão de microfone negada.");
    }
  }

  async function stopRecordingAndTranscribe() {
    const mr = mediaRecRef.current;
    if (!mr || mr.state === "inactive") return;
    setRecording(false);

    await new Promise<void>((resolve) => {
      mr.onstop = () => { resolve(); };
      mr.stop();
    });

    const blob = new Blob(audioChunks.current, { type: "audio/webm" });
    if (blob.size < 1000) return; // muito curto

    setTranscribing(true);
    try {
      const form = new FormData();
      form.append("audio", blob, "audio.webm");
      const { data } = await api.post<ApiResponse<{ transcricao: string }>>(
        `/agentes/${id}/transcribe`, form, { headers: { "Content-Type": "multipart/form-data" } }
      );
      setMensagem(data.data.transcricao);
      textareaRef.current?.focus();
      setTimeout(resizeTextarea, 0);
    } finally {
      setTranscribing(false);
    }
  }

  const temConteudo = mensagem.trim() || imagemPreview;

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: "#0b141a" }}>

      {/* ── Header ── */}
      <div className="flex shrink-0 items-center gap-3 px-4 py-2" style={{ background: "#202c33", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <button onClick={() => navigate(-1)} className="mr-1 rounded-full p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: "#00a884" }}>
          {agenteName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-[15px] font-medium text-white">{agenteName}</p>
          <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>{agente?.modelo ?? "IA"}</p>
        </div>
      </div>

      {/* ── Área de mensagens ── */}
      <div
        className="flex-1 overflow-y-auto px-[5%] py-3"
        style={{
          background: "#0b141a",
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='52' height='52' viewBox='0 0 52 52' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h52v52H0z' fill='none'/%3E%3Cpath d='M26 0v52M0 26h52' stroke='%23ffffff' stroke-width='0.3' stroke-opacity='0.04'/%3E%3C/svg%3E")`,
        }}
        onClick={() => setShowEmoji(false)}
      >
        {chat.length === 0 && !isTyping && (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-xl px-5 py-3 text-center text-[13px]" style={{ background: "#182229", color: "rgba(255,255,255,0.45)" }}>
              <p>Envie uma mensagem para começar o teste.</p>
              <p className="mt-1 text-[11px]" style={{ color: "rgba(255,255,255,0.28)" }}>
                Enter para enviar · Ctrl+Enter para nova linha · segure o mic para gravar
              </p>
            </div>
          </div>
        )}

        {chat.length > 0 && <DateSeparator label="Hoje" />}

        <div className="space-y-[1px]">
          {chat.map((m, i) => <Balao key={i} mensagem={m} agenteName={agenteName} />)}
        </div>

        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} className="h-2" />
      </div>

      {/* ── Preview de imagem ── */}
      {imagemPreview && (
        <div className="shrink-0 border-t border-white/10 px-4 py-2" style={{ background: "#202c33" }}>
          <div className="relative inline-block">
            <img src={imagemPreview.url} alt="Preview" className="h-20 w-20 rounded-lg object-cover" />
            <button
              onClick={() => setImagemPreview(null)}
              className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <p className="mt-1 text-[11px] text-white/40">
            {imagemPreview.file.name} · {(imagemPreview.file.size / 1024).toFixed(0)} KB
          </p>
        </div>
      )}

      {/* ── Emoji picker ── */}
      {showEmoji && (
        <div className="shrink-0" style={{ background: "#202c33" }}>
          <EmojiPicker
            theme={Theme.DARK}
            onEmojiClick={onEmojiClick}
            width="100%"
            height={340}
            skinTonesDisabled
            searchPlaceholder="Pesquisar emoji..."
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      {/* ── Barra de input ── */}
      <div className="flex shrink-0 items-end gap-2 px-3 py-[6px]" style={{ background: "#202c33" }}>
        {/* Emoji */}
        <button
          tabIndex={-1}
          onClick={() => setShowEmoji((v) => !v)}
          className="mb-[7px] shrink-0 transition"
          style={{ color: showEmoji ? "#00a884" : "rgba(255,255,255,0.4)" }}
        >
          <Smile className="h-[26px] w-[26px]" />
        </button>

        {/* Arquivo de imagem */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelect} />
        <button
          tabIndex={-1}
          onClick={() => fileInputRef.current?.click()}
          className="mb-[7px] shrink-0 transition"
          style={{ color: imagemPreview ? "#00a884" : "rgba(255,255,255,0.4)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = imagemPreview ? "#00a884" : "rgba(255,255,255,0.4)")}
        >
          <Paperclip className="h-[26px] w-[26px]" />
        </button>

        {/* Textarea */}
        <div className="flex flex-1 items-end rounded-lg px-4 py-[9px]" style={{ background: "#2a3942" }}>
          {transcribing ? (
            <p className="w-full py-[1px] text-[14px] text-white/50 animate-pulse">Transcrevendo áudio...</p>
          ) : recording ? (
            <p className="w-full py-[1px] text-[14px] text-red-400 animate-pulse">Gravando... solte para enviar</p>
          ) : (
            <textarea
              ref={textareaRef}
              rows={1}
              value={mensagem}
              onChange={(e) => { setMensagem(e.target.value); resizeTextarea(); }}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma mensagem"
              className="w-full resize-none bg-transparent text-[14px] leading-[20px] text-white/90 placeholder-white/35 outline-none"
              style={{ maxHeight: "120px" }}
            />
          )}
        </div>

        {/* Enviar / Mic */}
        {temConteudo ? (
          <button
            onClick={enviar}
            disabled={mutation.isPending}
            className="mb-[3px] flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-50"
            style={{ background: "#00a884" }}
          >
            <Send className="h-[18px] w-[18px] text-white" style={{ transform: "translateX(1px)" }} />
          </button>
        ) : (
          <button
            className="mb-[3px] flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 select-none"
            style={{ background: recording ? "#ef4444" : "#00a884" }}
            onMouseDown={startRecording}
            onMouseUp={stopRecordingAndTranscribe}
            onMouseLeave={() => recording && stopRecordingAndTranscribe()}
            onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopRecordingAndTranscribe(); }}
          >
            {recording ? (
              <MicOff className="h-[18px] w-[18px] text-white animate-pulse" />
            ) : transcribing ? (
              <Mic className="h-[18px] w-[18px] text-white opacity-50" />
            ) : (
              <Mic className="h-[18px] w-[18px] text-white" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
