import React, { useState, useEffect } from 'react';
import TopBar from '../components/TopBar';
import { Database, RefreshCw, Send, AlertCircle, CheckCircle2, Users } from 'lucide-react';
import { fetchVasyEmployees, VasyEmployee } from '../services/vasyService';
import { useAuth } from '../context/AuthContext';

import { useOutletContext } from 'react-router-dom';
import { LayoutContextType } from '../App';

export default function VasyIntegrationView() {
  const { onMenuClick } = useOutletContext<LayoutContextType>();
  const { user } = useAuth();
  const [endpoint, setEndpoint] = useState('api/v1/employees');
  const [method, setMethod] = useState('GET');
  const [payload, setPayload] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<VasyEmployee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  useEffect(() => {
    const loadEmployees = async () => {
      if (!user) return;
      try {
        const data = await fetchVasyEmployees(user.id, user.role);
        setEmployees(data);
      } catch (error) {
        console.error("Failed to load employees", error);
      } finally {
        setLoadingEmployees(false);
      }
    };
    loadEmployees();
  }, [user]);

  const handleTestConnection = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vasy/${endpoint.replace(/^\//, '')}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-role': user.role
        },
        body: (method !== 'GET' && method !== 'HEAD' && payload) ? payload : undefined,
      });
      
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] transition-colors">
      <TopBar title="VasyERP Integration" icon="database" onMenuClick={onMenuClick} />
      
      <div className="flex-1 overflow-y-auto pb-24 no-scrollbar px-4 pt-4">
        <section className="p-5 bg-white rounded-[2rem] shadow-soft border border-slate-100 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">VasyERP Status</h2>
              <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>API Key Configured</span>
              </div>
            </div>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            Your VasyERP testing account is connected. You can use the API tester below to verify endpoints and data.
          </p>
        </section>

        <section className="bg-white rounded-[2rem] shadow-soft border border-slate-100 overflow-hidden mb-6">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Fetched Employees</h3>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl">
              <Users className="w-4 h-4" />
              {loadingEmployees ? 'Loading...' : `${employees.length} Employees`}
            </div>
          </div>
          <div className="p-5">
            {loadingEmployees ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 text-primary-500 animate-spin" />
              </div>
            ) : employees.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {employees.map(emp => (
                  <div key={emp.id} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-primary-200 hover:shadow-md transition-all group">
                    <img src={emp.avatarUrl} alt={emp.firstName} className="w-12 h-12 rounded-full object-cover border-2 border-slate-100 group-hover:border-primary-200 transition-colors" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs font-medium text-slate-500">{emp.email}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary-600 mt-1">{emp.designation || 'Employee'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm font-medium">
                No employees found.
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-[2rem] shadow-soft border border-slate-100 overflow-hidden mb-6">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-4">API Tester</h3>
            
            <div className="flex gap-2 mb-4">
              <select 
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block p-2.5 font-bold"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
              <input 
                type="text" 
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="e.g., api/v1/products"
                className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 font-medium"
              />
            </div>

            {(method === 'POST' || method === 'PUT') && (
              <div className="mb-4">
                <label className="block mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Payload (JSON)</label>
                <textarea 
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  rows={4}
                  className="block p-2.5 w-full text-sm text-slate-900 bg-slate-50 rounded-xl border border-slate-200 focus:ring-primary-500 focus:border-primary-500 font-mono"
                  placeholder='{"key": "value"}'
                ></textarea>
              </div>
            )}

            <button 
              onClick={handleTestConnection}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 text-white font-black rounded-xl hover:bg-primary-700 transition-all shadow-glow active:scale-95 disabled:opacity-70"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {loading ? 'Sending...' : 'Send Request'}
            </button>
          </div>

          {(response || error) && (
            <div className="p-5 bg-slate-900">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Response</h4>
                {error && <span className="text-xs font-bold text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Error</span>}
              </div>
              <pre className="text-xs text-emerald-400 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                {error ? error : JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
