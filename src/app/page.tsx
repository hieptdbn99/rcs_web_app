"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Bot, Package, Play, CheckCircle2, AlertCircle, Loader2, MapPin, Repeat, Square } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function Home() {
  const [loadingTask, setLoadingTask] = useState<boolean>(false);
  const [isRepeating, setIsRepeating] = useState<boolean>(false);

  // Trạng thái nhập liệu từ giao diện
  const [taskType, setTaskType] = useState('PF-DETECT-CARRIER');
  const [carrierCode, setCarrierCode] = useState('');
  const [destinationCode, setDestinationCode] = useState('');
  const [repeatInterval, setRepeatInterval] = useState('');

  // Trạng thái nhập liệu cho gán Kệ
  const [bindCarrierCode, setBindCarrierCode] = useState('');
  const [bindSiteCode, setBindSiteCode] = useState('');
  const [bindDirection, setBindDirection] = useState('0');
  const [loadingBind, setLoadingBind] = useState<boolean>(false);

  // Trạng thái cho TEST RUN
  const [loadingRun, setLoadingRun] = useState<boolean>(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopRepeating = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRepeating(false);
    toast('Đã dừng chế độ tự động lặp lại!', { icon: '🛑' });
  };

  // Dọn dẹp interval khi tắt web để tránh rò rỉ bộ nhớ
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const executeLiftTask = async () => {
    if (!carrierCode.trim() || !destinationCode.trim()) {
      toast.error('Vui lòng nhập đầy đủ Mã kệ và Điểm đích!', {
        icon: <AlertCircle className="text-yellow-500" />
      });
      return;
    }

    const intervalSeconds = parseInt(repeatInterval);
    const isLoop = !isNaN(intervalSeconds) && intervalSeconds > 0;

    // Hàm gọi API lõi
    const sendTask = async () => {
      setLoadingTask(true);

      const targetRoute = [
        { seq: 0, type: "CARRIER", code: [carrierCode.trim()] },
        { seq: 1, type: "SITE", code: [destinationCode.trim()] }
      ];

      try {
        const response = await fetch('/api/robot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            targetRoute,
            taskType: taskType.trim() || "PF-DETECT-CARRIER"
          }),
        });

        const data = await response.json();

        if (response.ok && data.success && data.rcsResponse?.code === "SUCCESS") {
          toast.success(`Đã gửi lệnh: Kệ [${carrierCode}] -> Trạm [${destinationCode}]`, {
            icon: <CheckCircle2 className="text-green-500" />
          });
        } else {
          toast.error(`Thất bại: ${data.error || data.rcsResponse?.message || 'Lỗi không xác định'}`, {
            icon: <AlertCircle className="text-red-500" />
          });
          // Tự động dừng lặp nếu server báo lỗi
          if (isLoop) stopRepeating();
        }
      } catch (error: any) {
        toast.error(`Lỗi hệ thống: ${error.message}`);
        if (isLoop) stopRepeating();
      } finally {
        setLoadingTask(false);
      }
    };

    // Chạy lệnh lần đầu tiên ngay lập tức
    await sendTask();

    // Nếu có thiết lập thời gian lặp, bắt đầu chạy ngầm
    if (isLoop) {
      setIsRepeating(true);
      intervalRef.current = setInterval(() => {
        sendTask();
      }, intervalSeconds * 1000);

      toast.success(`Bật chế độ tự động lặp lại mỗi ${intervalSeconds} giây`, {
        icon: <Repeat className="text-blue-500" />
      });
    }
  };

  const executeBindTask = async () => {
    if (!bindCarrierCode.trim() || !bindSiteCode.trim()) {
      toast.error('Vui lòng nhập đầy đủ Mã kệ và Điểm đích để gán!', {
        icon: <AlertCircle className="text-yellow-500" />
      });
      return;
    }

    setLoadingBind(true);
    try {
      const response = await fetch('/api/carrier/bind', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          carrierCode: bindCarrierCode.trim(),
          siteCode: bindSiteCode.trim(),
          carrierDir: bindDirection
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.rcsResponse?.code === "0" || data.rcsResponse?.code === "SUCCESS") {
        toast.success(`Đã cập nhật: Kệ [${bindCarrierCode}] -> Trạm [${bindSiteCode}]`, {
          icon: <CheckCircle2 className="text-green-500" />
        });
        setBindCarrierCode('');
        setBindSiteCode('');
      } else {
        toast.error(`Thất bại: ${data.error || data.rcsResponse?.message || 'Lỗi không xác định'}`, {
          icon: <AlertCircle className="text-red-500" />
        });
      }
    } catch (error: any) {
      toast.error(`Lỗi hệ thống: ${error.message}`);
    } finally {
      setLoadingBind(false);
    }
  };

  const executeRunTask = async () => {
    setLoadingRun(true);
    try {
      const response = await fetch('/api/robot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskType: "Run",
          targetRoute: [
            { type: "SITE", code: "0014390AA0015661", seq: 0, autoStart: 1, operation: "COLLECT" },
            { type: "SITE", code: "0033431AA0018151", seq: 1, autoStart: 1, operation: "DELIVERY" }
          ],
          extraParams: {
            initPriority: 10,
            extra: {
              producer: "mes",
              values: {
                width: 5,
                high: 10
              }
            },
            interrupt: 0
          }
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.rcsResponse?.code === "SUCCESS") {
        toast.success(`Đã gửi lệnh Test RUN thành công!`, {
          icon: <CheckCircle2 className="text-green-500" />
        });
      } else {
        toast.error(`Thất bại: ${data.error || data.rcsResponse?.message || 'Lỗi không xác định'}`, {
          icon: <AlertCircle className="text-red-500" />
        });
      }
    } catch (error: any) {
      toast.error(`Lỗi hệ thống: ${error.message}`);
    } finally {
      setLoadingRun(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12 font-sans selection:bg-purple-500/30">
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid #333'
        }
      }} />

      {/* Background gradients */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full"></div>
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        <header className="flex items-center gap-4 mb-12 animate-fade-in-down">
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              LMR Transporter
            </h1>
            <p className="text-gray-400 mt-1">Điều khiển Robot Nâng kệ (Latent Mobile Robot)</p>
          </div>
        </header>

        {/* Dynamic Task Form */}
        <div className="group relative overflow-hidden rounded-3xl p-8 transition-all duration-300 ease-out 
                       bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl
                       border border-white/10 hover:border-purple-500/30
                       shadow-[0_0_40px_rgba(0,0,0,0.3)]
                       animate-fade-in-up">

          <div className="absolute -right-16 -top-16 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-colors duration-700"></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="inline-flex p-4 rounded-2xl bg-black/40 border border-white/5 shadow-inner">
                  <Package className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">Điều phối Kệ hàng</h2>
                  <p className="text-gray-400 text-sm">Nhập thông tin mục tiêu bên dưới để ra lệnh</p>
                </div>
              </div>

              {isRepeating && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30 animate-pulse">
                  <Repeat className="w-4 h-4" />
                  <span className="text-sm font-medium">Đang lặp lại...</span>
                </div>
              )}
            </div>

            <div className="space-y-6 mb-8">
              {/* Task Type Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-green-400" />
                  Mã Lệnh (Task Type)
                </label>
                <input
                  type="text"
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  placeholder="VD: PF-DETECT-CARRIER"
                  disabled={isRepeating}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all font-mono disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Carrier Code Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-400" />
                    Mã Kệ (Carrier Code)
                  </label>
                  <input
                    type="text"
                    value={carrierCode}
                    onChange={(e) => setCarrierCode(e.target.value)}
                    placeholder="VD: RACK_01"
                    disabled={isRepeating}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all disabled:opacity-50"
                  />
                </div>

                {/* Destination Code Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    Điểm Đích (Destination)
                  </label>
                  <input
                    type="text"
                    value={destinationCode}
                    onChange={(e) => setDestinationCode(e.target.value)}
                    placeholder="VD: TRAM_LAP_RAP"
                    disabled={isRepeating}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Repeat Interval Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-yellow-400" />
                  Thời gian lặp lại tự động (Giây)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={repeatInterval}
                    onChange={(e) => setRepeatInterval(e.target.value)}
                    placeholder="Để trống nếu chỉ muốn chạy 1 lần"
                    disabled={isRepeating}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all disabled:opacity-50"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">s</span>
                </div>
                <p className="mt-2 text-xs text-gray-500">Nhập số giây để tự động gửi lại lệnh này (VD: 60). Hệ thống sẽ chạy ngầm cho đến khi bạn bấm dừng.</p>
              </div>
            </div>

            <div className="flex gap-4">
              {!isRepeating ? (
                <button
                  onClick={executeLiftTask}
                  disabled={loadingTask}
                  className={`flex-1 py-4 px-6 rounded-xl font-medium text-lg tracking-wide
                            transition-all duration-300 flex items-center justify-center gap-2
                            ${loadingTask
                      ? 'bg-purple-600/20 text-purple-300 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] border border-purple-500/50'
                    }`}
                >
                  {loadingTask ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Đang gửi lệnh...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      Thực thi Lệnh Nâng Kệ
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={stopRepeating}
                  className="flex-1 py-4 px-6 rounded-xl font-medium text-lg tracking-wide bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] border border-red-500/50 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Square className="w-5 h-5 fill-current" />
                  Dừng Vòng Lặp
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Cập nhật Vị trí Kệ Thủ Công */}
        <div className="group relative overflow-hidden rounded-3xl p-8 mt-8 transition-all duration-300 ease-out 
                       bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl
                       border border-white/10 hover:border-yellow-500/30
                       shadow-[0_0_40px_rgba(0,0,0,0.3)]
                       animate-fade-in-up" style={{ animationDelay: '0.1s' }}>

          <div className="absolute -right-16 -top-16 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl group-hover:bg-yellow-500/20 transition-colors duration-700"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="inline-flex p-4 rounded-2xl bg-black/40 border border-white/5 shadow-inner">
                <MapPin className="w-8 h-8 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Cập nhật Vị trí Kệ Thủ công</h2>
                <p className="text-gray-400 text-sm">Gắn vị trí kệ trên hệ thống khi bị kéo đi bằng tay</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Carrier Code Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-400" />
                  Mã Kệ (Carrier)
                </label>
                <input
                  type="text"
                  value={bindCarrierCode}
                  onChange={(e) => setBindCarrierCode(e.target.value)}
                  placeholder="VD: RACK_01"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all"
                />
              </div>

              {/* Site Code Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  Trạm Mới (Site)
                </label>
                <input
                  type="text"
                  value={bindSiteCode}
                  onChange={(e) => setBindSiteCode(e.target.value)}
                  placeholder="VD: TRAM_B"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all"
                />
              </div>

              {/* Direction Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-green-400" />
                  Góc xoay (Độ)
                </label>
                <select
                  value={bindDirection}
                  onChange={(e) => setBindDirection(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all appearance-none"
                >
                  <option value="0">0°</option>
                  <option value="90">90°</option>
                  <option value="180">180°</option>
                  <option value="-90">-90°</option>
                </select>
              </div>
            </div>

            <button
              onClick={executeBindTask}
              disabled={loadingBind}
              className={`w-full py-4 px-6 rounded-xl font-medium text-lg tracking-wide
                        transition-all duration-300 flex items-center justify-center gap-2
                        ${loadingBind
                  ? 'bg-yellow-600/20 text-yellow-300 cursor-not-allowed'
                  : 'bg-yellow-600/80 hover:bg-yellow-500 text-white shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)] border border-yellow-500/50'
                }`}
            >
              {loadingBind ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang đồng bộ...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 fill-current text-white/50" />
                  Gắn Kệ vào Trạm mới
                </>
              )}
            </button>
          </div>
        </div>

        {/* Nút DEV / TEST RUN */}
        <div className="mt-8 pt-8 border-t border-white/10 flex justify-end">
          <button
            onClick={executeRunTask}
            disabled={loadingRun}
            className={`py-3 px-6 rounded-xl font-medium text-sm tracking-wide
                      transition-all duration-300 flex items-center justify-center gap-2
                      ${loadingRun
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/50 hover:border-slate-500/50'
              }`}
          >
            {loadingRun ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Bot className="w-4 h-4" />
            )}
            Test RUN Task (TEST.md)
          </button>
        </div>

      </div>
    </main>
  );
}
