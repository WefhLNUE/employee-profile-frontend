'use client';
import React from 'react';

const EmployeeModal = ({ employee, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500">X</button>
        <h2 className="text-xl font-bold mb-4">{employee.firstName} {employee.lastName}</h2>
        <p><strong>Email:</strong> {employee.personalEmail}</p>
        <p><strong>Phone:</strong> {employee.mobilePhone}</p>
        <p><strong>Address:</strong> {employee.address?.streetAddress}, {employee.address?.city}, {employee.address?.country}</p>
        <p><strong>Bio:</strong> {employee.biography}</p>
      </div>
    </div>
  );
};

export default EmployeeModal;
