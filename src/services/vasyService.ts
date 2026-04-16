import { generateId } from '../utils/idGenerator';

export interface VasyEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  designation?: string;
  avatarUrl?: string;
}

export const fetchVasyEmployees = async (userId: string, userRole: string): Promise<VasyEmployee[]> => {
  try {
    const response = await fetch('/api/vasy/api/v1/employees', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-user-id': userId,
        'x-user-role': userRole
      }
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Handle different response formats from VasyERP
    const employees = Array.isArray(data) ? data : (data.data && Array.isArray(data.data) ? data.data : null);
    
    if (employees) {
      return employees.map((emp: any) => ({
        id: emp.id || emp.employeeId || generateId('EMP'),
        firstName: emp.firstName || emp.name?.split(' ')[0] || 'Unknown',
        lastName: emp.lastName || emp.name?.split(' ').slice(1).join(' ') || '',
        email: emp.email || '',
        phone: emp.phone || '',
        designation: emp.designation || emp.role || 'Employee',
        avatarUrl: emp.profilePic || emp.avatar || `https://ui-avatars.com/api/?name=${emp.firstName || 'U'}+${emp.lastName || ''}&background=random`
      }));
    }
    
    throw new Error('Unexpected data format');
  } catch (error) {
    console.warn('VasyERP API error, using mock data:', error);
    // Fallback mock data for the demo
    return [
      { id: 'v1', firstName: 'Sarah', lastName: 'Connor', email: 'sarah@vasyerp.com', designation: 'Project Manager', avatarUrl: 'https://i.pravatar.cc/150?u=v1' },
      { id: 'v2', firstName: 'John', lastName: 'Doe', email: 'john@vasyerp.com', designation: 'Frontend Developer', avatarUrl: 'https://i.pravatar.cc/150?u=v2' },
      { id: 'v3', firstName: 'Alice', lastName: 'Smith', email: 'alice@vasyerp.com', designation: 'UX Designer', avatarUrl: 'https://i.pravatar.cc/150?u=v3' },
      { id: 'v4', firstName: 'Bob', lastName: 'Johnson', email: 'bob@vasyerp.com', designation: 'Backend Developer', avatarUrl: 'https://i.pravatar.cc/150?u=v4' },
      { id: 'v5', firstName: 'Emma', lastName: 'Davis', email: 'emma@vasyerp.com', designation: 'QA Engineer', avatarUrl: 'https://i.pravatar.cc/150?u=v5' }
    ];
  }
};
