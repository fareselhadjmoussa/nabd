import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { adminAPI } from '../services/api';
import { useAuthStore, useThemeStore } from '../stores';

const reasonLabels = {
  spam: 'رسائل مزعجة',
  harassment: 'إزعاج أو تهديد',
  inappropriate: 'محتوى غير مناسب',
  impersonation: 'انتحال شخصية',
  other: 'سبب آخر',
};

function Admin() {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState('users');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [reportStatus, setReportStatus] = useState('pending');
  const [loading, setLoading] = useState(true);

  if (user?.role !== 'admin') return <Navigate to="/chat" replace />;

  const loadStats = async () => {
    const response = await adminAPI.getStats();
    setStats(response.data.data.stats);
  };

  const loadUsers = async () => {
    const response = await adminAPI.getUsers({ search, status, limit: 50 });
    setUsers(response.data.data.users || []);
  };

  const loadReports = async () => {
    const response = await adminAPI.getReports({ status: reportStatus, limit: 50 });
    setReports(response.data.data.reports || []);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadStats(), loadUsers(), loadReports()]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطأ في تحميل لوحة التحكم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    loadUsers().catch(() => {});
  }, [status]);

  useEffect(() => {
    loadReports().catch(() => {});
  }, [reportStatus]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadUsers().catch(() => toast.error('خطأ في البحث'));
  };

  const updateUser = async (targetUser, data) => {
    try {
      const response = await adminAPI.updateUser(targetUser._id, data);
      const updatedUser = response.data.data.user;
      setUsers((list) => list.map((item) => item._id === updatedUser._id ? { ...item, ...updatedUser } : item));
      await loadStats();
      toast.success(response.data.message || 'تم التحديث');
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر تحديث المستخدم');
    }
  };

  const deleteUser = async (targetUser) => {
    if (!confirm(`هل تريد حذف ${targetUser.username} نهائياً؟`)) return;
    try {
      await adminAPI.deleteUser(targetUser._id);
      setUsers((list) => list.filter((item) => item._id !== targetUser._id));
      await loadStats();
      toast.success('تم حذف المستخدم');
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر حذف المستخدم');
    }
  };

  const updateReport = async (report, nextStatus) => {
    try {
      const adminNote = nextStatus === 'dismissed' ? 'تم رفض البلاغ' : 'تمت مراجعة البلاغ';
      await adminAPI.updateReport(report._id, { status: nextStatus, adminNote });
      setReports((list) => list.filter((item) => item._id !== report._id));
      await loadStats();
      toast.success('تم تحديث البلاغ');
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر تحديث البلاغ');
    }
  };

  return (
    <div className="min-h-screen bg-dark-300 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black">لوحة تحكم نبض</h1>
            <p className="text-gray-400 mt-1">إدارة المستخدمين والبلاغات وحماية الموقع</p>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleTheme} className="px-4 py-2 rounded-xl bg-dark-200 hover:bg-dark-100">
              {theme === 'dark' ? '☀️ فاتح' : '🌙 داكن'}
            </button>
            <Link to="/chat" className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600">رجوع للشات</Link>
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
          {[
            ['المستخدمون', stats?.users || 0],
            ['المحظورون', stats?.bannedUsers || 0],
            ['المحادثات', stats?.conversations || 0],
            ['الرسائل', stats?.messages || 0],
            ['بلاغات معلقة', stats?.pendingReports || 0],
            ['كل البلاغات', stats?.totalReports || 0],
          ].map(([label, value]) => (
            <div key={label} className="bg-dark-200 border border-gray-700 rounded-2xl p-4">
              <p className="text-gray-400 text-sm">{label}</p>
              <p className="text-2xl font-black mt-2">{value}</p>
            </div>
          ))}
        </div>

        <div className="bg-dark-200 border border-gray-700 rounded-2xl overflow-hidden">
          <div className="flex border-b border-gray-700">
            <button onClick={() => setActiveTab('users')} className={`flex-1 p-4 ${activeTab === 'users' ? 'bg-dark-100 text-primary-400' : 'text-gray-400'}`}>المستخدمون</button>
            <button onClick={() => setActiveTab('reports')} className={`flex-1 p-4 ${activeTab === 'reports' ? 'bg-dark-100 text-primary-400' : 'text-gray-400'}`}>البلاغات</button>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-400">جاري التحميل...</div>
          ) : activeTab === 'users' ? (
            <div className="p-4">
              <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3 mb-4">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو البريد" className="flex-1 bg-dark-100 border border-gray-700 rounded-xl px-4 py-2 focus:outline-none" />
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-dark-100 border border-gray-700 rounded-xl px-4 py-2">
                  <option value="all">الكل</option>
                  <option value="active">نشط</option>
                  <option value="banned">محظور</option>
                  <option value="admin">مدير</option>
                </select>
                <button className="bg-primary-500 hover:bg-primary-600 rounded-xl px-5 py-2">بحث</button>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-gray-400 border-b border-gray-700">
                    <tr>
                      <th className="p-3 text-right">المستخدم</th>
                      <th className="p-3 text-right">البريد</th>
                      <th className="p-3 text-right">الدور</th>
                      <th className="p-3 text-right">الحالة</th>
                      <th className="p-3 text-right">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((item) => (
                      <tr key={item._id} className="border-b border-gray-800 hover:bg-dark-100/60">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {item.avatar ? <img src={item.avatar} className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center font-bold">{item.username?.[0]}</div>}
                            <span>{item.username}</span>
                          </div>
                        </td>
                        <td className="p-3 text-gray-300">{item.email}</td>
                        <td className="p-3">{item.role === 'admin' ? 'مدير' : 'مستخدم'}</td>
                        <td className="p-3">{item.isBanned ? <span className="text-red-400">محظور</span> : <span className="text-green-400">نشط</span>}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => updateUser(item, { role: item.role === 'admin' ? 'user' : 'admin' })} className="px-3 py-1 rounded-lg bg-dark-100 hover:bg-gray-700">{item.role === 'admin' ? 'إزالة مدير' : 'جعله مدير'}</button>
                            <button onClick={() => updateUser(item, { isBanned: !item.isBanned, bannedReason: 'تم حظر الحساب من الإدارة' })} className={`px-3 py-1 rounded-lg ${item.isBanned ? 'bg-green-600' : 'bg-orange-600'}`}>{item.isBanned ? 'إلغاء الحظر' : 'حظر'}</button>
                            <button onClick={() => deleteUser(item)} className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700">حذف</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <div className="mb-4 flex gap-3">
                <select value={reportStatus} onChange={(e) => setReportStatus(e.target.value)} className="bg-dark-100 border border-gray-700 rounded-xl px-4 py-2">
                  <option value="pending">معلقة</option>
                  <option value="reviewed">تمت المراجعة</option>
                  <option value="resolved">محلولة</option>
                  <option value="dismissed">مرفوضة</option>
                  <option value="all">الكل</option>
                </select>
              </div>

              <div className="space-y-3">
                {reports.length === 0 ? (
                  <div className="text-center text-gray-400 p-8">لا توجد بلاغات</div>
                ) : reports.map((report) => (
                  <div key={report._id} className="bg-dark-100 border border-gray-700 rounded-2xl p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <p className="font-bold">بلاغ ضد: {report.reportedUser?.username || 'مستخدم محذوف'}</p>
                        <p className="text-sm text-gray-400">من: {report.reporter?.username || 'غير معروف'} • السبب: {reasonLabels[report.reason] || report.reason}</p>
                        {report.details && <p className="mt-2 text-gray-300">{report.details}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => updateReport(report, 'resolved')} className="px-3 py-2 rounded-xl bg-green-600">حل البلاغ</button>
                        <button onClick={() => updateReport(report, 'dismissed')} className="px-3 py-2 rounded-xl bg-gray-600">رفض</button>
                        {report.reportedUser?._id && <button onClick={() => updateUser(report.reportedUser, { isBanned: true, bannedReason: 'تم الحظر بسبب بلاغات المستخدمين' })} className="px-3 py-2 rounded-xl bg-orange-600">حظر المستخدم</button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Admin;
