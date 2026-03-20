import React from 'react';
import { Lock, X } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  handleAdminLogin: (e: React.FormEvent<HTMLFormElement>) => void;
  password: string;
  setPassword: (pass: string) => void;
}

const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  handleAdminLogin,
  password,
  setPassword
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest">Acceso Admin</h2>
            <p className="text-slate-400 text-[9px] font-bold uppercase mt-1">Ingrese su clave maestra</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-all"><X size={20} /></button>
        </div>
        <form onSubmit={handleAdminLogin} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password" 
                autoFocus
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-blue-700 transition-all">
            Ingresar al Sistema
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginModal;
