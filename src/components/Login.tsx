import React from 'react';
import { Lock, User, GraduationCap, ArrowLeft } from 'lucide-react';
import { AppConfig } from '../types';

interface LoginProps {
  globalConfig: AppConfig;
  handleLogin: (e: React.FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
}

const Login: React.FC<LoginProps> = ({
  globalConfig,
  handleLogin,
  onBack
}) => {
  return (
    <div className="h-full flex items-center justify-center gradient-brand p-6" style={{ background: `linear-gradient(135deg, ${globalConfig.theme.primaryColor} 0%, ${globalConfig.theme.secondaryColor} 100%)` }}>
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md animate-slide-up relative">
        <button 
          onClick={onBack}
          className="absolute top-4 left-4 p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-all"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="text-center mb-6 pt-4">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4" style={{ backgroundColor: globalConfig.theme.primaryColor }}>
            {globalConfig.logo ? <img src={globalConfig.logo} className="w-full h-full object-contain p-2" /> : <GraduationCap size={32} className="text-white" />}
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{globalConfig.siteName}</h1>
          <p className="text-slate-500 text-xs font-medium tracking-wide">Acceso Administrativo</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-3">
          <div className="relative">
            <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input name="username" type="text" placeholder="Nombre de Usuario" className="w-full pl-12 p-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-sm" required />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input name="password" type="password" placeholder="Contraseña" className="w-full pl-12 p-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-sm" required />
          </div>
          <button type="submit" className="w-full text-white font-black py-4 rounded-xl transition-all shadow-lg uppercase tracking-widest mt-2 text-xs" style={{ backgroundColor: globalConfig.theme.primaryColor }}>
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
