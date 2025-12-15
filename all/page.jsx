'use client';

import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import axios from 'axios';
import { useSearchParams } from 'next/navigation';


export default function AllEmployeesPage() {
//   const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const searchParams = useSearchParams();
  const token = searchParams.get('token'); // <-- read token from query

  const [employees, setEmployees] = useState([]);


//   useEffect(() => {
//     async function fetchEmployees() {
//       try {
//         const res = await axios.get('http://localhost:5000/employee-profile/all', {
//           headers: {
//           Authorization: `Bearer ${yourTokenHere}` // replace with your actual token
//         }
//         });
//         setEmployees(res.data);
//       } catch (err) {
//         console.error(err);
//         setError('Failed to load employees');
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchEmployees();
//   }, []);
 useEffect(() => {
    if (!token) return;

    const fetchEmployees = async () => {
      try {
        const res = await fetch('/api/employee-profile', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error('Failed to fetch employees');

        const data = await res.json();
        setEmployees(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchEmployees();
  }, [token]);

  const filteredEmployees = employees.filter(emp =>
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;
  if (employees.length === 0) return <p>No employees found</p>;

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>All Employees</h2>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search
            size={18}
            style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#999' }}
          />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.5rem', width: '100%', height: '2rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '0.5rem' }}>Employee #</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '0.5rem' }}>Name</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '0.5rem' }}>Email</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '0.5rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map(emp => (
              <tr key={emp._id}>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{emp.employeeNumber}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{emp.firstName} {emp.lastName}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{emp.workEmail || emp.email}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                  <button style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}>View Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
