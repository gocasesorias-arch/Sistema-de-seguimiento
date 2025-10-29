import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Upload, AlertTriangle, CheckCircle, Clock, TrendingUp, Users, FileText, Calendar, Filter, Download } from 'lucide-react';

const TrainingDashboard = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [participacionesData, setParticipacionesData] = useState(null);
  const [planData, setPlanData] = useState(null);
  const [selectedRole, setSelectedRole] = useState('todos');
  const [dateRange, setDateRange] = useState('all');

  // Procesar archivo CSV/Excel
  const handleFileUpload = async (file, type) => {
    const text = await file.text();
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = lines.slice(1).map(line => {
      const values = line.split(',');
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = values[i]?.trim();
      });
      return obj;
    }).filter(row => row[headers[0]]); // Filtrar filas vacías

    if (type === 'participaciones') {
      setParticipacionesData(data);
    } else {
      setPlanData(data);
    }
  };

  // Calcular KPIs
  const calculateKPIs = () => {
    if (!participacionesData || !planData) return null;

    // CNE% - Cumplimiento Normativo Efectivo
    const criticos = participacionesData.filter(p => p.Criticidad === 'Alta' || p.Criticidad === 'Crítico');
    const criticosCompletos = criticos.filter(p => p.Estado === 'C' || p.Estado === 'Cerrado');
    const cnePercent = criticos.length > 0 ? (criticosCompletos.length / criticos.length * 100).toFixed(1) : 0;

    // LeadTime C p95
    const cerrados = participacionesData.filter(p => p.Estado === 'C' || p.Estado === 'Cerrado');
    const leadTimes = cerrados.map(p => {
      if (p.FechaInicio && p.FechaCierre) {
        const inicio = new Date(p.FechaInicio);
        const cierre = new Date(p.FechaCierre);
        return Math.floor((cierre - inicio) / (1000 * 60 * 60 * 24));
      }
      return null;
    }).filter(t => t !== null).sort((a, b) => a - b);
    const p95Index = Math.floor(leadTimes.length * 0.95);
    const leadTimeP95 = leadTimes[p95Index] || 0;

    // WIP Age EP/PR
    const enProgreso = participacionesData.filter(p => p.Estado === 'EP' || p.Estado === 'En Progreso');
    const pendientes = participacionesData.filter(p => p.Estado === 'PR' || p.Estado === 'Pendiente');
    const wipAgeEP = enProgreso.length > 0 ? Math.round(enProgreso.reduce((acc, p) => {
      if (p.FechaInicio) {
        const inicio = new Date(p.FechaInicio);
        const hoy = new Date();
        return acc + Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24));
      }
      return acc;
    }, 0) / enProgreso.length) : 0;

    const wipAgePR = pendientes.length > 0 ? Math.round(pendientes.reduce((acc, p) => {
      if (p.FechaInicio) {
        const inicio = new Date(p.FechaInicio);
        const hoy = new Date();
        return acc + Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24));
      }
      return acc;
    }, 0) / pendientes.length) : 0;

    // Throughput Semanal
    const ultimaSemana = participacionesData.filter(p => {
      if (p.FechaCierre) {
        const cierre = new Date(p.FechaCierre);
        const hoy = new Date();
        const diff = (hoy - cierre) / (1000 * 60 * 60 * 24);
        return diff <= 7;
      }
      return false;
    });
    const throughput = ultimaSemana.length;

    // % Conversión P→C
    const planificados = participacionesData.filter(p => p.Estado !== 'P' && p.Estado !== 'Propuesto');
    const conversionPercent = planificados.length > 0 ? (cerrados.length / planificados.length * 100).toFixed(1) : 0;

    // % Registro LMS/Acta
    const conRegistro = participacionesData.filter(p => p.RegistroLMS === 'Sí' || p.RegistroLMS === 'Si');
    const registroPercent = participacionesData.length > 0 ? (conRegistro.length / participacionesData.length * 100).toFixed(1) : 0;

    return {
      cnePercent,
      leadTimeP95,
      wipAgeEP,
      wipAgePR,
      throughput,
      conversionPercent,
      registroPercent
    };
  };

  const kpis = calculateKPIs();

  // Función para determinar color del semáforo
  const getSemaforo = (kpi, value) => {
    const thresholds = {
      cnePercent: { verde: 95, amarillo: 90 },
      leadTimeP95: { verde: 45, amarillo: 60 },
      wipAgeEP: { verde: 15, amarillo: 30 },
      wipAgePR: { verde: 7, amarillo: 10 },
      throughput: { verde: 120, amarillo: 100 },
      conversionPercent: { verde: 85, amarillo: 75 },
      registroPercent: { verde: 98, amarillo: 95 }
    };

    const t = thresholds[kpi];
    if (!t) return 'gray';

    if (kpi === 'leadTimeP95' || kpi === 'wipAgeEP' || kpi === 'wipAgePR') {
      // Menor es mejor
      if (value <= t.verde) return 'green';
      if (value <= t.amarillo) return 'yellow';
      return 'red';
    } else {
      // Mayor es mejor
      if (value >= t.verde) return 'green';
      if (value >= t.amarillo) return 'yellow';
      return 'red';
    }
  };

  // Componente de KPI Card
  const KPICard = ({ title, value, unit, icon: Icon, kpiKey }) => {
    const color = kpis ? getSemaforo(kpiKey, parseFloat(value)) : 'gray';
    const colorClasses = {
      green: 'bg-green-50 border-green-500 text-green-700',
      yellow: 'bg-yellow-50 border-yellow-500 text-yellow-700',
      red: 'bg-red-50 border-red-500 text-red-700',
      gray: 'bg-gray-50 border-gray-300 text-gray-600'
    };

    return (
      <div className={`p-4 rounded-lg border-l-4 ${colorClasses[color]}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium opacity-75">{title}</span>
          <Icon className="w-5 h-5 opacity-50" />
        </div>
        <div className="text-3xl font-bold">
          {value}{unit}
        </div>
      </div>
    );
  };

  // Vista Dashboard Ejecutivo
  const DashboardView = () => {
    if (!kpis) {
      return (
        <div className="text-center py-12">
          <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Carga los archivos de datos para visualizar el dashboard</p>
        </div>
      );
    }

    const distributionData = participacionesData ? [
      { name: 'Propuesto', value: participacionesData.filter(p => p.Estado === 'P').length, color: '#94a3b8' },
      { name: 'Planificado', value: participacionesData.filter(p => p.Estado === 'PL').length, color: '#60a5fa' },
      { name: 'En Progreso', value: participacionesData.filter(p => p.Estado === 'EP').length, color: '#fbbf24' },
      { name: 'Pend. Registro', value: participacionesData.filter(p => p.Estado === 'PR').length, color: '#f97316' },
      { name: 'Cerrado', value: participacionesData.filter(p => p.Estado === 'C').length, color: '#22c55e' }
    ] : [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
            title="CNE% Críticos" 
            value={kpis.cnePercent} 
            unit="%" 
            icon={CheckCircle}
            kpiKey="cnePercent"
          />
          <KPICard 
            title="LeadTime C p95" 
            value={kpis.leadTimeP95} 
            unit=" días" 
            icon={Clock}
            kpiKey="leadTimeP95"
          />
          <KPICard 
            title="WIP Age EP" 
            value={kpis.wipAgeEP} 
            unit=" días" 
            icon={TrendingUp}
            kpiKey="wipAgeEP"
          />
          <KPICard 
            title="WIP Age PR" 
            value={kpis.wipAgePR} 
            unit=" días" 
            icon={AlertTriangle}
            kpiKey="wipAgePR"
          />
          <KPICard 
            title="Throughput Semanal" 
            value={kpis.throughput} 
            unit="" 
            icon={Users}
            kpiKey="throughput"
          />
          <KPICard 
            title="% Conversión P→C" 
            value={kpis.conversionPercent} 
            unit="%" 
            icon={TrendingUp}
            kpiKey="conversionPercent"
          />
          <KPICard 
            title="% Registro LMS/Acta" 
            value={kpis.registroPercent} 
            unit="%" 
            icon={FileText}
            kpiKey="registroPercent"
          />
          <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">Total Cursos</span>
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-blue-700">
              {participacionesData?.length || 0}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Distribución por Estado</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Top Alertas Activas</h3>
            <div className="space-y-3">
              {kpis.wipAgePR > 10 && (
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded border-l-4 border-red-500">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-700">WIP Age PR excede umbral crítico</p>
                    <p className="text-sm text-red-600">Promedio {kpis.wipAgePR} días en Pendiente Registro</p>
                  </div>
                </div>
              )}
              {kpis.cnePercent < 90 && (
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded border-l-4 border-red-500">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-700">CNE% Crítico bajo umbral</p>
                    <p className="text-sm text-red-600">Cumplimiento normativo en {kpis.cnePercent}%</p>
                  </div>
                </div>
              )}
              {kpis.leadTimeP95 > 60 && (
                <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded border-l-4 border-yellow-500">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-700">LeadTime p95 elevado</p>
                    <p className="text-sm text-yellow-600">{kpis.leadTimeP95} días desde planificación a cierre</p>
                  </div>
                </div>
              )}
              {kpis.wipAgePR <= 10 && kpis.cnePercent >= 90 && kpis.leadTimeP95 <= 60 && (
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded border-l-4 border-green-500">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-700">Todos los KPIs en rango óptimo</p>
                    <p className="text-sm text-green-600">Sistema operando según estándares</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Vista Kanban
  const KanbanView = () => {
    if (!participacionesData) {
      return <div className="text-center py-12 text-gray-600">Carga datos para ver el Kanban</div>;
    }

    const columns = [
      { id: 'P', name: 'Propuesto', color: 'bg-gray-100' },
      { id: 'PL', name: 'Planificado', color: 'bg-blue-100' },
      { id: 'EP', name: 'En Progreso', color: 'bg-yellow-100' },
      { id: 'PR', name: 'Pend. Registro', color: 'bg-orange-100' },
      { id: 'C', name: 'Cerrado', color: 'bg-green-100' }
    ];

    return (
      <div className="space-y-4">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(col => {
            const items = participacionesData.filter(p => p.Estado === col.id);
            return (
              <div key={col.id} className={`flex-shrink-0 w-72 ${col.color} rounded-lg p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{col.name}</h3>
                  <span className="bg-white rounded-full px-2 py-1 text-sm font-medium">{items.length}</span>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {items.map((item, idx) => (
                    <div key={idx} className="bg-white p-3 rounded shadow-sm">
                      <p className="font-medium text-sm mb-1">{item.Curso || item.NombreCurso || 'Sin nombre'}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Users className="w-3 h-3" />
                        <span>{item.Participante || item.Empleado || 'N/A'}</span>
                      </div>
                      {item.Criticidad && (
                        <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs ${
                          item.Criticidad === 'Alta' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {item.Criticidad}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard de Capacitación</h1>
              <p className="text-sm text-gray-600">Single Source of Truth - Trazabilidad Normativa</p>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                <Download className="w-4 h-4" />
                Exportar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`px-4 py-3 font-medium border-b-2 ${
                activeView === 'dashboard' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Dashboard Ejecutivo
            </button>
            <button
              onClick={() => setActiveView('kanban')}
              className={`px-4 py-3 font-medium border-b-2 ${
                activeView === 'kanban' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Vista Kanban
            </button>
            <button
              onClick={() => setActiveView('data')}
              className={`px-4 py-3 font-medium border-b-2 ${
                activeView === 'data' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Cargar Datos
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeView === 'dashboard' && <DashboardView />}
        {activeView === 'kanban' && <KanbanView />}
        {activeView === 'data' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Cargar Datos de Participaciones</h2>
              <p className="text-sm text-gray-600 mb-4">
                Archivo CSV con columnas: Estado, Curso, Participante, FechaInicio, FechaCierre, Criticidad, RegistroLMS
              </p>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'participaciones')}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {participacionesData && (
                <p className="mt-2 text-sm text-green-600">✓ {participacionesData.length} registros cargados</p>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Cargar Plan de Capacitación</h2>
              <p className="text-sm text-gray-600 mb-4">
                Archivo CSV con el plan anual de capacitaciones
              </p>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'plan')}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {planData && (
                <p className="mt-2 text-sm text-green-600">✓ {planData.length} cursos planificados cargados</p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Formato de Datos Requerido</h3>
              <div className="text-sm text-blue-800 space-y-2">
                <p><strong>Participaciones.csv:</strong></p>
                <code className="block bg-white p-2 rounded text-xs">
                  Estado,Curso,Participante,FechaInicio,FechaCierre,Criticidad,RegistroLMS<br/>
                  EP,Seguridad Operacional,Juan Pérez,2024-01-15,2024-02-15,Alta,Sí<br/>
                  C,Prevención Riesgos,María González,2024-01-10,2024-01-30,Alta,Sí
                </code>
                <p className="mt-3"><strong>Estados válidos:</strong> P (Propuesto), PL (Planificado), EP (En Progreso), PR (Pendiente Registro), C (Cerrado)</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainingDashboard;