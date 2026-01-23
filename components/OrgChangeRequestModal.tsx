
import React, { useEffect, useState } from "react";
import { Building2, Briefcase, UserPlus, Edit, X, Send, Save, AlertCircle, CheckCircle } from "lucide-react";

interface Department { _id: string; name: string; code: string; }
interface Position { _id: string; title: string; code: string; }
interface Employee { _id: string; firstName: string; lastName: string; }

interface OrgChangeRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialDescription?: string;
    initialEmployeeId?: string;
}

const REQUEST_TYPES = [
    { value: 'NEW_DEPARTMENT', label: 'New Department', icon: Building2, description: 'Request to create a new department' },
    { value: 'UPDATE_DEPARTMENT', label: 'Update Department', icon: Edit, description: 'Request to modify an existing department' },
    { value: 'NEW_POSITION', label: 'New Position', icon: UserPlus, description: 'Request to create a new position' },
    { value: 'UPDATE_POSITION', label: 'Update Position', icon: Briefcase, description: 'Request to modify an existing position' },
    { value: 'CLOSE_POSITION', label: 'Close Position', icon: X, description: 'Request to deactivate a position' },
];

export default function OrgChangeRequestModal({ isOpen, onClose, initialDescription, initialEmployeeId }: OrgChangeRequestModalProps) {
    const [requestType, setRequestType] = useState('');
    const [departments, setDepartments] = useState<Department[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form fields
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedPosition, setSelectedPosition] = useState('');
    const [newDepartmentName, setNewDepartmentName] = useState('');
    const [newPositionTitle, setNewPositionTitle] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadData();
            if (initialDescription) {
                setReason(initialDescription);
            }
            if (initialEmployeeId) {
                // Auto-select the employee associated with the request
                setSelectedEmployee(initialEmployeeId);
            }
        }
    }, [isOpen, initialDescription, initialEmployeeId]);

    const loadData = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const [deptRes, posRes, empRes] = await Promise.all([
                fetch('http://localhost:5000/organization-structure/departments', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('http://localhost:5000/organization-structure/positions', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('http://localhost:5000/employee-profile', { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            if (deptRes.ok) setDepartments(await deptRes.json());
            if (posRes.ok) setPositions(await posRes.json());
            if (empRes.ok) setEmployees(await empRes.json());
        } catch (err) {
            console.error('Failed to load data', err);
        }
    };

    const handleSubmit = async (asDraft: boolean) => {
        if (!requestType) {
            setMessage({ type: 'error', text: 'Please select a request type' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setMessage({ type: 'error', text: 'Not authenticated' });
                return;
            }

            let endpoint = '';
            let body: any = { asDraft, reason };

            if (requestType === 'UPDATE_DEPARTMENT') {
                endpoint = '/organization-structure/change-request/department';
                body = { ...body, employeeId: selectedEmployee, oldDept: '', newDept: selectedDepartment };
            } else if (requestType === 'UPDATE_POSITION') {
                endpoint = '/organization-structure/change-request/position';
                body = { ...body, employeeId: selectedEmployee, oldPos: '', newPos: selectedPosition, customPositionTitle: newPositionTitle || undefined };
            } else {
                // For NEW_DEPARTMENT, NEW_POSITION, CLOSE_POSITION - use generic endpoint
                endpoint = '/organization-structure/change-request/generic';
                body = {
                    asDraft,
                    requestType,
                    details: requestType === 'NEW_DEPARTMENT' ? `Create new department: ${newDepartmentName}` :
                        requestType === 'NEW_POSITION' ? `Create new position: ${newPositionTitle}` :
                            `Close position: ${positions.find(p => p._id === selectedPosition)?.title}`,
                    reason,
                    targetDepartmentId: selectedDepartment || undefined,
                    targetPositionId: selectedPosition || undefined,
                };
            }

            const response = await fetch(`http://localhost:5000${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: asDraft ? 'Request saved as draft!' : 'Organisation Request submitted successfully!' });
                setTimeout(() => {
                    onClose();
                    setMessage(null);
                    // Reset form
                    setRequestType('');
                    setReason('');
                    setNewDepartmentName('');
                    setNewPositionTitle('');
                    setSelectedDepartment('');
                    setSelectedPosition('');
                    setSelectedEmployee('');
                }, 1500);
            } else {
                const error = await response.text();
                setMessage({ type: 'error', text: `Error: ${error}` });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Network error' });
        } finally {
            setLoading(false);
        }
    };

    const renderFields = () => {
        switch (requestType) {
            case 'NEW_DEPARTMENT':
                return (
                    <div className="flex flex-col gap-4">
                        <label className="font-semibold text-slate-700">New Department Name</label>
                        <input
                            type="text"
                            value={newDepartmentName}
                            onChange={(e) => setNewDepartmentName(e.target.value)}
                            placeholder="e.g., Customer Success"
                            className="p-3 border border-slate-200 rounded-lg"
                        />
                    </div>
                );
            case 'UPDATE_DEPARTMENT':
                return (
                    <>
                        <div className="flex flex-col gap-2">
                            <label className="font-semibold text-slate-700">Employee</label>
                            <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="p-3 border border-slate-200 rounded-lg">
                                <option value="">Select Employee</option>
                                {employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="font-semibold text-slate-700">New Department</label>
                            <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="p-3 border border-slate-200 rounded-lg">
                                <option value="">Select Department</option>
                                {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                            </select>
                        </div>
                    </>
                );
            case 'NEW_POSITION':
                return (
                    <>
                        <div className="flex flex-col gap-2">
                            <label className="font-semibold text-slate-700">New Position Title</label>
                            <input
                                type="text"
                                value={newPositionTitle}
                                onChange={(e) => setNewPositionTitle(e.target.value)}
                                placeholder="e.g., Senior Developer"
                                className="p-3 border border-slate-200 rounded-lg"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="font-semibold text-slate-700">Department (Optional)</label>
                            <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="p-3 border border-slate-200 rounded-lg">
                                <option value="">Select Department</option>
                                {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                            </select>
                        </div>
                    </>
                );
            case 'UPDATE_POSITION':
                return (
                    <>
                        <div className="flex flex-col gap-2">
                            <label className="font-semibold text-slate-700">Employee</label>
                            <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="p-3 border border-slate-200 rounded-lg">
                                <option value="">Select Employee</option>
                                {employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="font-semibold text-slate-700">New Position</label>
                            <select value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value)} className="p-3 border border-slate-200 rounded-lg">
                                <option value="">Select Position</option>
                                {positions.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="font-semibold text-slate-700">Or Enter Custom Title</label>
                            <input
                                type="text"
                                value={newPositionTitle}
                                onChange={(e) => setNewPositionTitle(e.target.value)}
                                placeholder="Custom position title (optional)"
                                className="p-3 border border-slate-200 rounded-lg"
                            />
                        </div>
                    </>
                );
            case 'CLOSE_POSITION':
                return (
                    <div className="flex flex-col gap-2">
                        <label className="font-semibold text-slate-700">Position to Close</label>
                        <select value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value)} className="p-3 border border-slate-200 rounded-lg">
                            <option value="">Select Position</option>
                            {positions.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                        </select>
                    </div>
                );
            default:
                return null;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
            <div className="bg-white rounded-xl shadow-2xl border border-white/20 w-full max-w-5xl max-h-[90vh] overflow-y-auto transform transition-all scale-100">
                <div className="bg-gradient-to-r from-purple-800 to-indigo-700 p-6 flex justify-between items-center text-white rounded-t-xl sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold">Send Change Department/Position Request</h2>
                        <p className="text-purple-200 text-sm">Follow-up Organizational Change Request</p>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6">
                    {message && (
                        <div className={`p-4 mb-6 rounded-xl flex items-center gap-3 ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                            {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                            {message.text}
                        </div>
                    )}

                    {/* Step 1: Request Type */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 mb-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">1. Select Request Type</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {REQUEST_TYPES.map((type) => {
                                const Icon = type.icon;
                                return (
                                    <div
                                        key={type.value}
                                        onClick={() => setRequestType(type.value)}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${requestType === type.value
                                            ? 'border-purple-600 bg-purple-50 shadow-[0_0_0_2px_rgba(124,58,237,0.1)]'
                                            : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`p-2 rounded-lg ${requestType === type.value ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                <Icon size={18} />
                                            </div>
                                            <span className="font-semibold text-slate-800">{type.label}</span>
                                        </div>
                                        <p className="text-xs text-slate-500">{type.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Step 2: Details */}
                    {requestType && (
                        <div className="bg-white p-6 rounded-xl border border-slate-200 mb-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">2. Request Details</h3>
                            <div className="flex flex-col gap-4">
                                {renderFields()}
                                <div className="flex flex-col gap-2">
                                    <label className="font-semibold text-slate-700">Reason / Justification</label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Provide a reason for this request..."
                                        rows={3}
                                        className="p-3 border border-slate-200 rounded-lg resize-y"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    {requestType && (
                        <div className="flex gap-4 justify-end">
                            <button
                                onClick={() => handleSubmit(true)}
                                disabled={loading}
                                className="px-6 py-2.5 rounded-xl font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-all"
                            >
                                <Save size={18} /> Save as Draft
                            </button>
                            <button
                                onClick={() => handleSubmit(false)}
                                disabled={loading}
                                className="px-6 py-2.5 rounded-xl font-semibold bg-gradient-to-br from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2 transition-all shadow-md shadow-purple-200"
                            >
                                <Send size={18} /> {loading ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
