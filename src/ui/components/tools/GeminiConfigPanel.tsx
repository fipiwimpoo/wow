import React, { useState, useEffect } from "react";
import { KeyRound, Check, X, Loader2 } from "lucide-react";

export function GeminiConfigPanel() {
  const [apiKey, setApiKey] = useState("");
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [model, setModel] = useState("gemini-2.5-flash");
  const [savedModel, setSavedModel] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(
    null,
  );
  const [backendTestResult, setBackendTestResult] = useState<
    "success" | "error" | null
  >(null);
  const [backendTesting, setBackendTesting] = useState(false);
  const [backendResponse, setBackendResponse] = useState("");

  useEffect(() => {
    const key = localStorage.getItem("gemini_api_key");
    const savedMod = localStorage.getItem("gemini_model") || "gemini-2.5-flash";
    if (key) {
      setSavedKey(key);
      setApiKey(key);
    }
    setModel(savedMod);
    setSavedModel(savedMod);
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem("gemini_api_key", apiKey.trim());
      localStorage.setItem("gemini_model", model);
      setSavedKey(apiKey.trim());
      setSavedModel(model);
      setTestResult(null);
    }
  };

  const handleDelete = () => {
    localStorage.removeItem("gemini_api_key");
    localStorage.removeItem("gemini_model");
    setSavedKey(null);
    setApiKey("");
    setSavedModel(null);
    setModel("gemini-2.5-flash");
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!savedKey) return;
    setTesting(true);
    setTestResult(null);
    try {
      // Small test request, we don't have a dedicated test route but we can hit an arbitrary API.
      // Since we didn't add a test route in server.ts, let's add one, or just assume success if it's there?
      // Let's do a fetch to a test endpoint. We need to add one to server.ts.
      const res = await fetch("/api/test-gemini", {
        method: "POST",
        headers: { "X-Gemini-Key": savedKey },
      });
      if (res.ok) {
        setTestResult("success");
      } else {
        setTestResult("error");
      }
    } catch (e) {
      setTestResult("error");
    } finally {
      setTesting(false);
    }
  };

  const handleTestBackend = async () => {
    setBackendTesting(true);
    setBackendTestResult(null);
    try {
      const res = await fetch("/api/health");
      const text = await res.text();
      setBackendResponse(text.slice(0, 200));
      if (res.ok && text.includes('"ok":true')) {
        setBackendTestResult("success");
      } else {
        setBackendTestResult("error");
      }
    } catch (e: any) {
      setBackendTestResult("error");
      setBackendResponse(e.message);
    } finally {
      setBackendTesting(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-neutral-300 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-blue-400" />
          Configuración de IA (Gemini BYOK)
        </h3>
        <button
          onClick={handleTestBackend}
          disabled={backendTesting}
          className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2 py-1 rounded transition-colors flex items-center gap-1"
        >
          {backendTesting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            "Probar Backend"
          )}
        </button>
      </div>

      {backendTestResult && (
        <div
          className={`mb-3 p-2 rounded text-xs border ${backendTestResult === "success" ? "bg-green-900/30 border-green-800 text-green-400" : "bg-red-900/30 border-red-800 text-red-400"}`}
        >
          <strong>Estado Backend: </strong>{" "}
          {backendTestResult === "success" ? "Conectado" : "Error"}
          <div className="mt-1 font-mono text-[10px] break-all">
            {backendResponse}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Pega tu API Key de Gemini aquí..."
          className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
        />
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
        >
          <option value="gemini-2.5-flash">gemini-2.5-flash</option>
          <option value="gemini-2.0-flash">gemini-2.0-flash</option>
          <option value="gemini-1.5-flash">gemini-1.5-flash</option>
        </select>
        {(savedKey !== apiKey || savedModel !== model) && (
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
          >
            Guardar
          </button>
        )}
        {savedKey && savedKey === apiKey && savedModel === model && (
          <>
            <button
              onClick={handleTest}
              disabled={testing}
              className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors flex items-center gap-1"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Probar Conexión"
              )}
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-900/50 hover:bg-red-800/50 text-red-400 px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              Borrar
            </button>
          </>
        )}
      </div>

      {testResult === "success" && (
        <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
          <Check className="w-3 h-3" /> Conexión exitosa
        </p>
      )}
      {testResult === "error" && (
        <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
          <X className="w-3 h-3" /> Error de conexión (revisa tu API Key)
        </p>
      )}
      {!savedKey && (
        <p className="text-neutral-500 text-xs mt-2">
          Sin API Key, el extractor usará el modo MOCK.
        </p>
      )}
    </div>
  );
}
