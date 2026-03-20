
import React, { useState } from 'react';
import { GraduationCap, Search, Lock, X, Keyboard, User } from 'lucide-react';
import { AppConfig } from '../types';

interface LandingProps {
  globalConfig: AppConfig;
  onConsultasSearch: (dni: string) => void;
  onAdminLogin: () => void;
  onLogin: () => void;
}

const Landing: React.FC<LandingProps> = ({ globalConfig, onConsultasSearch, onAdminLogin, onLogin }) => {
  const [isDniInputModalOpen, setIsDniInputModalOpen] = useState(false);
  const [consultasSearchDni, setConsultasSearchDni] = useState("");

  const handleConsultasSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConsultasSearch(consultasSearchDni);
    setConsultasSearchDni("");
    setIsDniInputModalOpen(false);
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ fontFamily: globalConfig.theme.fontFamily, background: `linear-gradient(135deg, ${globalConfig.theme.primaryColor}10 0%, ${globalConfig.theme.secondaryColor}10 100%)` }}>
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] animate-pulse opacity-20" style={{ backgroundColor: globalConfig.theme.primaryColor }}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] animate-pulse delay-700 opacity-20" style={{ backgroundColor: globalConfig.theme.secondaryColor }}></div>

      <div className="max-w-md w-full space-y-12 text-center relative z-10">
        <div className="space-y-4 animate-slide-up">
          <div className="w-24 h-24 rounded-[2.5rem] bg-white shadow-2xl border border-slate-100 flex items-center justify-center mx-auto mb-8 transition-transform hover:scale-110 duration-500">
            {globalConfig.logo ? <img src={globalConfig.logo} className="w-16 h-16 object-contain" /> : <GraduationCap size={48} style={{ color: globalConfig.theme.primaryColor }} />}
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            {globalConfig.siteName}
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">
            {globalConfig.slogan || "Educación con Valores y Tecnología"}
          </p>
        </div>

        <div className="space-y-6 animate-slide-up delay-150">
          <button 
            onClick={() => setIsDniInputModalOpen(true)}
            className="w-full py-10 bg-white border-2 border-slate-100 rounded-[3rem] shadow-2xl hover:shadow-blue-200/50 hover:border-blue-200 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 flex flex-col items-center gap-2">
              <Search size={40} style={{ color: globalConfig.theme.primaryColor }} className="mb-2" />
              <span className="text-4xl font-black text-slate-800 tracking-tight uppercase">Consultas</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acceso Público</span>
            </div>
          </button>

          <div className="flex justify-center gap-8">
            <button 
              onClick={onLogin}
              className="group flex flex-col items-center transition-all hover:scale-105"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                <User size={20} />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 group-hover:text-slate-900 transition-all">Ingresar</span>
            </button>

            <button 
              onClick={onAdminLogin}
              className="group flex flex-col items-center transition-all hover:scale-105"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                <Lock size={20} />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 group-hover:text-slate-900 transition-all">Admin</span>
            </button>
          </div>
        </div>
      </div>

      {/* DNI Input Modal */}
      {isDniInputModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up border-8 border-white">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg"><Keyboard size={18} /></div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-widest">Consulta DNI</h2>
                  <p className="text-slate-400 text-[9px] font-bold uppercase mt-1">Ingrese el documento</p>
                </div>
              </div>
              <button onClick={() => setIsDniInputModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={handleConsultasSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">DNI del Estudiante</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    autoFocus
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all"
                    value={consultasSearchDni}
                    onChange={(e) => setConsultasSearchDni(e.target.value)}
                    placeholder="Ej. 70654321"
                    required
                  />
                </div>
              </div>
              <button type="submit" className="w-full py-5 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:opacity-90 transition-all" style={{ backgroundColor: globalConfig.theme.primaryColor }}>
                Buscar Estudiante
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;
