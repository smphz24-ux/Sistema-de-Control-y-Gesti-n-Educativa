
import React, { useState, useRef, useEffect } from 'react';
import { GraduationCap, Search, Lock, X, Keyboard, User, QrCode, Clock, LogIn, LogOut, ArrowLeft } from 'lucide-react';
import { AppConfig } from '../types';
import jsQR from 'jsqr';

interface LandingProps {
  globalConfig: AppConfig;
  onConsultasSearch: (dni: string) => void;
  onAdminLogin: () => void;
  onLogin: () => void;
  onMarkAttendance: (dni: string, status: 'entrada' | 'salida' | 'tardanza' | 'permiso') => void;
  onVerifyPassword: (password: string) => Promise<boolean>;
}

const Landing: React.FC<LandingProps> = ({ globalConfig, onConsultasSearch, onAdminLogin, onLogin, onMarkAttendance, onVerifyPassword }) => {
  const [isDniInputModalOpen, setIsDniInputModalOpen] = useState(false);
  const [isAsistenciaViewOpen, setIsAsistenciaViewOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [consultasSearchDni, setConsultasSearchDni] = useState("");
  const [asistenciaDni, setAsistenciaDni] = useState("");
  const [asistenciaType, setAsistenciaType] = useState<'entrada' | 'salida' | 'tardanza'>('entrada');
  const [isScanning, setIsScanning] = useState(false);

  const handleConsultasSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConsultasSearch(consultasSearchDni);
    setConsultasSearchDni("");
    setIsDniInputModalOpen(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await onVerifyPassword(passwordInput)) {
      setIsPasswordModalOpen(false);
      setIsAsistenciaViewOpen(true);
      setPasswordInput("");
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleAsistenciaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onMarkAttendance(asistenciaDni, asistenciaType);
    setAsistenciaDni("");
  };

  const handleScan = React.useCallback((dni: string) => {
    onMarkAttendance(dni, asistenciaType);
    setIsScanning(false);
  }, [onMarkAttendance, asistenciaType]);

  return (
    <div className="min-h-full w-full flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden" style={{ fontFamily: globalConfig.theme.fontFamily, background: `linear-gradient(135deg, ${globalConfig.theme.primaryColor}10 0%, ${globalConfig.theme.secondaryColor}10 100%)` }}>
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[80px] md:blur-[120px] animate-pulse opacity-20" style={{ backgroundColor: globalConfig.theme.primaryColor }}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[80px] md:blur-[120px] animate-pulse delay-700 opacity-20" style={{ backgroundColor: globalConfig.theme.secondaryColor }}></div>

      <div className="max-w-4xl w-full space-y-8 md:space-y-12 text-center relative z-10 flex flex-col items-center">
        <div className="space-y-4 animate-slide-up w-full">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-[2rem] md:rounded-[2.5rem] bg-white shadow-2xl border border-slate-100 flex items-center justify-center mx-auto mb-6 md:mb-8 transition-transform hover:scale-110 duration-500">
            {globalConfig.logo ? <img src={globalConfig.logo} className="w-12 h-12 md:w-16 md:h-16 object-contain" referrerPolicy="no-referrer" /> : <GraduationCap size={40} style={{ color: globalConfig.theme.primaryColor }} />}
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none px-4">
            {globalConfig.siteName}
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] text-[8px] md:text-[10px]">
            {globalConfig.slogan || "Educación con Valores y Tecnología"}
          </p>
        </div>

        <div className="space-y-6 md:space-y-8 animate-slide-up delay-150 w-full max-w-2xl px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <button 
              onClick={() => setIsDniInputModalOpen(true)}
              className="w-full py-6 md:py-10 bg-white border-2 border-slate-100 rounded-[2rem] md:rounded-[3rem] shadow-2xl hover:shadow-blue-200/50 hover:border-blue-200 transition-all group relative overflow-hidden flex flex-col items-center justify-center"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10 flex flex-col items-center gap-1 md:gap-2 px-4">
                <Search size={28} md:size={40} style={{ color: globalConfig.theme.primaryColor }} className="mb-1 md:mb-2" />
                <span className="text-xl md:text-4xl font-black text-slate-800 tracking-tight uppercase leading-tight">Consultas</span>
                <span className="text-[7px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Acceso Público</span>
              </div>
            </button>

            <button 
              onClick={() => setIsPasswordModalOpen(true)}
              className="w-full py-6 md:py-10 bg-white border-2 border-slate-100 rounded-[2rem] md:rounded-[3rem] shadow-2xl hover:shadow-emerald-200/50 hover:border-emerald-200 transition-all group relative overflow-hidden flex flex-col items-center justify-center"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10 flex flex-col items-center gap-1 md:gap-2 px-4">
                <Clock size={28} md:size={40} className="text-emerald-600 mb-1 md:mb-2" />
                <span className="text-xl md:text-4xl font-black text-slate-800 tracking-tight uppercase leading-tight">Asistencia<br/>Rápida</span>
                <span className="text-[7px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Registro Rápido</span>
              </div>
            </button>
          </div>

          <div className="flex justify-center gap-6 md:gap-8 pt-4">
            <button 
              onClick={onLogin}
              className="group flex flex-col items-center transition-all hover:scale-105"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                <User size={18} md:size={20} />
              </div>
              <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 group-hover:text-slate-900 transition-all">Ingresar</span>
            </button>

            <button 
              onClick={onAdminLogin}
              className="group flex flex-col items-center transition-all hover:scale-105"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                <Lock size={18} md:size={20} />
              </div>
              <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 group-hover:text-slate-900 transition-all">Admin</span>
            </button>
          </div>
        </div>
      </div>

      {/* Password Modal for Asistencia Rápida */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 md:p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up border-4 md:border-8 border-white">
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg"><Lock size={18} /></div>
                <div>
                  <h2 className="text-lg md:text-xl font-black uppercase tracking-widest">Acceso Restringido</h2>
                  <p className="text-slate-400 text-[8px] md:text-[9px] font-bold uppercase mt-1">Ingrese su contraseña</p>
                </div>
              </div>
              <button onClick={() => { setIsPasswordModalOpen(false); setPasswordInput(""); setPasswordError(false); }} className="hover:bg-white/20 p-2 rounded-full transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={handlePasswordSubmit} className="p-6 md:p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Contraseña de Usuario</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password" 
                    autoFocus
                    className={`w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-2 font-black text-lg outline-none transition-all ${passwordError ? 'border-rose-500 bg-rose-50' : 'border-slate-100 focus:border-blue-500'}`}
                    value={passwordInput}
                    onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                    placeholder="••••••••"
                    required
                  />
                </div>
                {passwordError && <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest ml-2">Contraseña incorrecta</p>}
              </div>
              <button type="submit" className="w-full py-5 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:opacity-90 transition-all bg-slate-900">
                Verificar y Acceder
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DNI Input Modal */}
      {isDniInputModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up border-4 md:border-8 border-white">
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg"><Keyboard size={18} /></div>
                <div>
                  <h2 className="text-lg md:text-xl font-black uppercase tracking-widest">Consulta DNI</h2>
                  <p className="text-slate-400 text-[8px] md:text-[9px] font-bold uppercase mt-1">Ingrese el documento</p>
                </div>
              </div>
              <button onClick={() => setIsDniInputModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={handleConsultasSubmit} className="p-6 md:p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">DNI del Estudiante</label>
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
      {/* Asistencia Rápida View */}
      {isAsistenciaViewOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-50 flex flex-col animate-fade-in overflow-hidden">
          {/* Top Navigation Bar */}
          <nav className="h-16 md:h-20 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-8 shrink-0 shadow-sm">
            <div className="flex items-center gap-2 md:gap-4">
              <button 
                onClick={() => {
                  setIsAsistenciaViewOpen(false);
                  setIsScanning(false);
                }} 
                className="p-2 md:p-3 text-slate-600 hover:bg-slate-100 rounded-xl md:rounded-2xl transition-all"
              >
                <ArrowLeft size={20} md:size={24} />
              </button>
              <div>
                <h2 className="text-base md:text-xl font-black text-slate-900 uppercase tracking-tight">Asistencia Rápida</h2>
                <p className="text-[7px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Registro de Entrada y Salida</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 md:px-4 md:py-2 bg-emerald-50 rounded-lg md:rounded-xl border border-emerald-100">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[8px] md:text-[10px] font-black text-emerald-600 uppercase tracking-widest">Activa</span>
              </div>
            </div>
          </nav>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col items-center p-4 md:p-6 overflow-y-auto">
            <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {/* Left Column: Selection and Input */}
              <div className="space-y-6 md:space-y-8 order-2 lg:order-1">
                <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border border-slate-100 space-y-6 md:space-y-8">
                  <div>
                    <h3 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-tight mb-4">1. Seleccione Acción</h3>
                    <div className="grid grid-cols-3 gap-2 md:gap-3">
                      <button 
                        onClick={() => setAsistenciaType('entrada')}
                        className={`p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all flex flex-col items-center gap-1 md:gap-2 ${asistenciaType === 'entrada' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-emerald-200'}`}
                      >
                        <LogIn size={20} md:size={24} />
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">Entrada</span>
                      </button>
                      <button 
                        onClick={() => setAsistenciaType('tardanza')}
                        className={`p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all flex flex-col items-center gap-1 md:gap-2 ${asistenciaType === 'tardanza' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-amber-200'}`}
                      >
                        <Clock size={20} md:size={24} />
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">Tardanza</span>
                      </button>
                      <button 
                        onClick={() => setAsistenciaType('salida')}
                        className={`p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all flex flex-col items-center gap-1 md:gap-2 ${asistenciaType === 'salida' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-rose-200'}`}
                      >
                        <LogOut size={20} md:size={24} />
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">Salida</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-tight mb-4">2. Identificación</h3>
                    <form onSubmit={handleAsistenciaSubmit} className="space-y-4">
                      <div className="relative">
                        <Keyboard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} md:size={20} />
                        <input 
                          type="text" 
                          className="w-full pl-12 pr-4 py-4 md:py-5 rounded-xl md:rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg md:text-xl outline-none transition-all"
                          placeholder="Ingrese DNI"
                          value={asistenciaDni}
                          onChange={(e) => setAsistenciaDni(e.target.value)}
                        />
                      </div>
                      <button 
                        type="submit"
                        className="w-full py-4 md:py-5 bg-slate-900 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm shadow-xl hover:bg-slate-800 transition-all"
                      >
                        Registrar Asistencia
                      </button>
                    </form>
                  </div>
                </div>

                <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] shadow-lg border border-slate-100 flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <GraduationCap size={20} md:size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] md:text-xs font-black text-slate-800 uppercase tracking-tight">Terminal de Auto-Servicio</p>
                    <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Conectado a: {globalConfig.siteName}</p>
                  </div>
                </div>
              </div>

              {/* Right Column: QR Scanner */}
              <div className="bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl p-6 md:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group order-1 lg:order-2 min-h-[400px] md:min-h-[500px]">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent opacity-50"></div>
                
                <div className="relative z-10 w-full space-y-6 md:space-y-8">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-white/10 flex items-center justify-center mx-auto mb-2 md:mb-4 backdrop-blur-xl border border-white/10">
                    <QrCode size={32} md:size={40} className="text-white" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">Escáner QR</h3>
                    <p className="text-slate-400 text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Coloque el código frente a la cámara</p>
                  </div>

                  <div className="aspect-square w-full max-w-[260px] md:max-w-[300px] mx-auto bg-black/40 rounded-[1.5rem] md:rounded-[2rem] border-4 border-white/10 relative overflow-hidden flex items-center justify-center">
                    {isScanning ? (
                      <QRScanner onScan={handleScan} />
                    ) : (
                      <button 
                        onClick={() => setIsScanning(true)}
                        className="w-full h-full flex flex-col items-center justify-center gap-3 md:gap-4 text-white/40 hover:text-white transition-all group"
                      >
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <LogIn size={28} md:size={32} />
                        </div>
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">Activar Cámara</span>
                      </button>
                    )}
                    
                    {/* Scanning Animation Overlay */}
                    {isScanning && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="w-full h-1 bg-blue-500/50 absolute top-0 animate-[scanLine_2s_linear_infinite]"></div>
                        <div className="absolute inset-0 border-[30px] md:border-[40px] border-black/20"></div>
                      </div>
                    )}
                  </div>

                  <p className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    Compatible con carnets digitales y físicos
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const QRScanner: React.FC<{ onScan: (data: string) => void }> = ({ onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationFrameId: number;
    let isMounted = true;
    let currentStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        currentStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
            if (isMounted) {
              requestAnimationFrame(scan);
            }
          } catch (err) {
            // Only log if it's not the interruption error which we are handling
            if (err instanceof Error && err.name !== 'AbortError') {
              console.error("Error playing video:", err);
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error accessing camera:", err);
        }
      }
    };

    const scan = () => {
      if (!isMounted) return;
      if (videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          if (code) {
            onScan(code.data);
            return;
          }
        }
      }
      animationFrameId = requestAnimationFrame(scan);
    };

    startCamera();
    return () => {
      isMounted = false;
      cancelAnimationFrame(animationFrameId);
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [onScan]);

  return (
    <div className="relative w-full h-full">
      <video ref={videoRef} className="w-full h-full object-cover" playsInline />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Landing;
