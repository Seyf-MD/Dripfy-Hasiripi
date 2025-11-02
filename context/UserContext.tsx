import * as React from 'react';
import { Department, OperationalRole, User } from '../types';

interface UserContextValue {
  user: User | null;
  operationalRole: OperationalRole | null;
  department: Department | null;
  setOperationalRole: (role: OperationalRole | null) => void;
  setDepartment: (department: Department | null) => void;
}

const UserContext = React.createContext<UserContextValue | undefined>(undefined);

interface UserProviderProps {
  user: User | null;
  children: React.ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ user, children }) => {
  const [operationalRole, setOperationalRole] = React.useState<OperationalRole | null>(user?.operationalRole ?? null);
  const [department, setDepartment] = React.useState<Department | null>(user?.department ?? null);

  React.useEffect(() => {
    setOperationalRole(user?.operationalRole ?? null);
    setDepartment(user?.department ?? null);
  }, [user?.id, user?.operationalRole, user?.department]);

  const value = React.useMemo<UserContextValue>(() => ({
    user,
    operationalRole,
    department,
    setOperationalRole,
    setDepartment,
  }), [user, operationalRole, department]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export function useUserContext(): UserContextValue {
  const context = React.useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
}
