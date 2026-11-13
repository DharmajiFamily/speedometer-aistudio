import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, Globe, Smartphone } from 'lucide-react';
import {
  ANDROID_GRADLE_AND_MANIFEST,
  ANDROID_MAIN_ACTIVITY_KT,
  ANDROID_SPEEDOMETER_KT,
  generateAllInOneGitHubIndexHtml,
} from '../lib/codeTemplates';
import { firebaseConfig } from '../lib/firebase';

type ExportTab = 'github-html' | 'android-speedo' | 'android-main' | 'android-gradle';

export const CodeExportView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ExportTab>('github-html');
  const [copied, setCopied] = useState(false);

  const githubIndexHtml = useMemo(() => generateAllInOneGitHubIndexHtml(), []);

  const activeContent = useMemo(() => {
    switch (activeTab) {
      case 'github-html':
        return {
          filename: 'index.html',
          code: githubIndexHtml,
          mime: 'text/html',
        };
      case 'android-speedo':
        return {
          filename: 'DodgeChargerSpeedometer.kt',
          code: ANDROID_SPEEDOMETER_KT,
          mime: 'text/plain',
        };
      case 'android-main':
        return {
          filename: 'MainActivity.kt',
          code: ANDROID_MAIN_ACTIVITY_KT,
          mime: 'text/plain',
        };
      case 'android-gradle':
        return {
          filename: 'build-and-manifest.txt',
          code: ANDROID_GRADLE_AND_MANIFEST,
          mime: 'text/plain',
        };
    }
  }, [activeTab, githubIndexHtml]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeContent.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    const blob = new Blob([activeContent.code], { type: activeContent.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeContent.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-[#101218] p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-[#E11D2E]" />
            <h2 className="text-lg font-semibold text-white">All-in-One GitHub Pages index.html</h2>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Download the single-file <span className="font-mono-tabular text-zinc-200">index.html</span> below and
            upload it to a GitHub repository with GitHub Pages enabled. It includes the Dodge Charger
            speedometer, OpenStreetMap routing, Email/Password + Google Firebase Auth, and both Android Cockpit &amp;
            Windows Live Map views.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-[#101218] p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-[#E11D2E]" />
            <h2 className="text-lg font-semibold text-white">Firebase Setup for GitHub Pages</h2>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed">
            In Firebase Console for project <span className="font-mono-tabular text-zinc-200">{firebaseConfig.projectId}</span>,
            enable <strong>Email/Password</strong> under Authentication → Sign-in method, and add your{' '}
            <span className="font-mono-tabular text-zinc-200">username.github.io</span> domain under Authentication →
            Settings → Authorized domains.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-[#101218] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3 bg-[#0C0E13]">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'github-html', label: 'index.html (All-in-One GitHub)' },
              { id: 'android-speedo', label: 'DodgeChargerSpeedometer.kt' },
              { id: 'android-main', label: 'MainActivity.kt' },
              { id: 'android-gradle', label: 'Gradle & Manifest' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ExportTab)}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-[#E11D2E] text-white'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="min-h-[38px] px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-200 flex items-center gap-1.5 whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-xs font-semibold text-zinc-950 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Download {activeContent.filename}
            </button>
          </div>
        </div>

        <pre className="p-4 overflow-x-auto max-h-[540px] text-xs leading-relaxed font-mono-tabular text-zinc-300 bg-[#08090C]">
          <code>{activeContent.code}</code>
        </pre>
      </div>
    </div>
  );
};
