"use client";

import React, { useState } from 'react';
import { Bot, Package, Play, CheckCircle2, AlertCircle, Loader2, MapPin } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function Home() {
  const [loadingTask, setLoadingTask] = useState<boolean>(false);
  
  // Trạng thái nhập liệu từ giao diện
  const [taskType, setTaskType] = useState('PF-DETECT-CARRIER');
  const [carrierCode, setCarrierCode] = useState('');
  const [destinationCode, setDestinationCode] = useState('');

  const executeLiftTask = async () => {
    if (!carrierCode.trim() || !destinationCode.trim()) {
      toast.error('Vui lòng nhập đầy đủ Mã kệ và Điểm đích!', {
        icon: <AlertCircle className="text-yellow-500" />
      });
      return;
    }

    setLoadingTask(true);
    
    // Xây dựng targetRoute linh hoạt từ Form
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
        
        // Bạn có thể cân nhắc xóa form sau khi gửi thành công bằng cách set lại state
        // setCarrierCode('');
        // setDestinationCode('');
      } else {
        toast.error(`Thất bại: ${data.error || data.rcsResponse?.message || 'Lỗi không xác định'}`, {
          icon: <AlertCircle className="text-red-500" />
        });
      }
    } catch (error: any) {
      toast.error(`Lỗi hệ thống: ${error.message}`);
    } finally {
      setLoadingTask(false);
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
            <div className="flex items-center gap-4 mb-8">
              <div className="inline-flex p-4 rounded-2xl bg-black/40 border border-white/5 shadow-inner">
                <Package className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Điều phối Kệ hàng</h2>
                <p className="text-gray-400 text-sm">Nhập thông tin mục tiêu bên dưới để ra lệnh</p>
              </div>
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
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all font-mono"
                />
              </div>

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
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                />
              </div>

              {/* Destination Code Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  Điểm Đích (Destination Code)
                </label>
                <input 
                  type="text" 
                  value={destinationCode}
                  onChange={(e) => setDestinationCode(e.target.value)}
                  placeholder="VD: TRAM_LAP_RAP"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
              </div>
            </div>

            <button
              onClick={executeLiftTask}
              disabled={loadingTask}
              className={`w-full py-4 px-6 rounded-xl font-medium text-lg tracking-wide
                        transition-all duration-300 flex items-center justify-center gap-2
                        ${loadingTask 
                          ? 'bg-purple-600/20 text-purple-300 cursor-not-allowed' 
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] border border-purple-500/50'
                        }`}
            >
              {loadingTask ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang gửi lệnh đến hệ thống...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  Thực thi Lệnh Nâng Kệ
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
