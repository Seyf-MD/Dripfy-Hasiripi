import * as React from 'react';
import { Department, OperationalRole } from '../../../types';
import { useLanguage } from '../../../i18n/LanguageContext';

interface RoleFiltersProps {
  role: OperationalRole | null;
  department: Department | null;
  availableRoles: OperationalRole[];
  availableDepartments: Department[];
  onChangeRole: (role: OperationalRole | null) => void;
  onChangeDepartment: (department: Department | null) => void;
}

const RoleFilters: React.FC<RoleFiltersProps> = ({
  role,
  department,
  availableRoles,
  availableDepartments,
  onChangeRole,
  onChangeDepartment,
}) => {
  const { t, language } = useLanguage();
  
  const getRoleTranslation = (roleValue: OperationalRole): string => {
    const translations: Record<string, Record<OperationalRole, string>> = {
      'tr': {
        'admin': 'Yönetici',
        'finance': 'Finans',
        'operations': 'Operasyonlar',
        'product': 'Ürün',
        'medical': 'Tıbbi',
        'people': 'İnsan Kaynakları',
      },
      'en': {
        'admin': 'Admin',
        'finance': 'Finance',
        'operations': 'Operations',
        'product': 'Product',
        'medical': 'Medical',
        'people': 'People',
      },
      'de': {
        'admin': 'Administrator',
        'finance': 'Finanzen',
        'operations': 'Operationen',
        'product': 'Produkt',
        'medical': 'Medizinisch',
        'people': 'Personal',
      },
      'ru': {
        'admin': 'Администратор',
        'finance': 'Финансы',
        'operations': 'Операции',
        'product': 'Продукт',
        'medical': 'Медицинский',
        'people': 'Персонал',
      },
      'ar': {
        'admin': 'مدير',
        'finance': 'المالية',
        'operations': 'العمليات',
        'product': 'المنتج',
        'medical': 'طبي',
        'people': 'الأفراد',
      },
    };
    return translations[language]?.[roleValue] || roleValue;
  };
  
  const getDepartmentTranslation = (deptValue: Department): string => {
    const translations: Record<string, Record<Department, string>> = {
      'tr': {
        'Operations': 'Operasyonlar',
        'Expansion': 'Genişleme',
        'Revenue': 'Gelir',
        'Medical': 'Tıbbi',
        'Product': 'Ürün',
        'People': 'İnsan Kaynakları',
      },
      'en': {
        'Operations': 'Operations',
        'Expansion': 'Expansion',
        'Revenue': 'Revenue',
        'Medical': 'Medical',
        'Product': 'Product',
        'People': 'People',
      },
      'de': {
        'Operations': 'Operationen',
        'Expansion': 'Expansion',
        'Revenue': 'Einnahmen',
        'Medical': 'Medizinisch',
        'Product': 'Produkt',
        'People': 'Personal',
      },
      'ru': {
        'Operations': 'Операции',
        'Expansion': 'Расширение',
        'Revenue': 'Доход',
        'Medical': 'Медицинский',
        'Product': 'Продукт',
        'People': 'Персонал',
      },
      'ar': {
        'Operations': 'العمليات',
        'Expansion': 'التوسع',
        'Revenue': 'الإيرادات',
        'Medical': 'طبي',
        'Product': 'المنتج',
        'People': 'الأفراد',
      },
    };
    return translations[language]?.[deptValue] || deptValue;
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <span className="font-medium">{t('okr.role')}</span>
        <select
          value={role ?? ''}
          onChange={(event) => onChangeRole(event.target.value ? event.target.value as OperationalRole : null)}
          className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">{t('filters.all') || 'Tümü'}</option>
          {availableRoles.map((item) => (
            <option key={item} value={item}>{getRoleTranslation(item)}</option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <span className="font-medium">{t('okr.department')}</span>
        <select
          value={department ?? ''}
          onChange={(event) => onChangeDepartment(event.target.value ? event.target.value as Department : null)}
          className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">{t('filters.all') || 'Tümü'}</option>
          {availableDepartments.map((item) => (
            <option key={item} value={item}>{getDepartmentTranslation(item)}</option>
          ))}
        </select>
      </label>
    </div>
  );
};

export default RoleFilters;
