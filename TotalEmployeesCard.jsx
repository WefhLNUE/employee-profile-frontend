'use client';
import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import APIService from './apiService.jsx'; // your existing API service

const api = new APIService();

const TotalEmployeesCard = () => {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchTotal = async () => {
      try {
        const employees = await api.getAllEmployees();
        setTotal(employees.length);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTotal();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-xl shadow-md">
          <div className="flex items-center justify-between mb-2">
            <Users size={32} className="opacity-80" />
            <span className="text-3xl font-bold">{total}</span>
          </div>
          <p className="text-sm opacity-90">Total Employees</p>
        </div>
        {/* Add more cards here: Pending Requests, Approved Requests, etc. */}
      </div>
    </div>
  );
};

export default TotalEmployeesCard;
