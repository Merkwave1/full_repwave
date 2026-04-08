// src/components/dashboard/tabs/visit-plans-management/VisitPlansTab.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  getAllVisitPlans, 
  deleteVisitPlan,
  getVisitPlanDetail,
  addVisitPlan,
  updateVisitPlan
} from '../../../../apis/visitPlans.js';
import { getAllUsers } from '../../../../apis/users.js';
import NumberInput from '../../../common/NumberInput/NumberInput.jsx';
import Modal from '../../../common/Modal/Modal.jsx';
import Button from '../../../common/Button/Button.jsx';
import CustomPageHeader from '../../../common/CustomPageHeader/CustomPageHeader.jsx';
import FilterBar from '../../../common/FilterBar/FilterBar.jsx';
import GlobalTable from '../../../common/GlobalTable/GlobalTable.jsx';
import PaginationHeaderFooter from '../../../common/PaginationHeaderFooter/PaginationHeaderFooter.jsx';
import { 
  PlusIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

function VisitPlansTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const navigate = useNavigate();
  
  // Data states
  const [visitPlans, setVisitPlans] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedRepresentative, setSelectedRepresentative] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'visit_plan_name', direction: 'asc' });
  
  // UI states
  const [currentView, setCurrentView] = useState('list'); // 'list', 'add', 'edit', 'details'
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    visit_plan_name: '',
    visit_plan_description: '',
    user_id: '',
    visit_plan_status: 'Active',
    visit_plan_start_date: '',
    visit_plan_end_date: '',
    visit_plan_recurrence_type: 'Weekly',
    visit_plan_selected_days: [],
    visit_plan_repeat_every: 1
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs for refresh handlers
  const refreshDataRef = useRef(null);

  // Day names in Arabic (1=Saturday to 7=Friday as per your schema)
  const dayNames = {
    1: 'السبت',
    2: 'الأحد', 
    3: 'الاثنين',
    4: 'الثلاثاء',
    5: 'الأربعاء',
    6: 'الخميس',
    7: 'الجمعة'
  };

  // Load all data function
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [plansData, usersData] = await Promise.all([
        getAllVisitPlans(),
        getAllUsers()
      ]);
      
      setVisitPlans(plansData || []);
      setUsers(usersData || []);
      
      // Debug: Log the visit plans data to check selected days format
    } catch (err) {
      console.error('Error loading visit plans data:', err);
      setError(err.message || 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter visit plans based on search and filters
  const filteredVisitPlans = useMemo(() => {
    return visitPlans.filter(plan => {
      // Search filter
      const matchesSearch = !searchTerm || 
        plan.visit_plan_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.visit_plan_description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus = selectedStatus === 'all' || plan.visit_plan_status === selectedStatus;
      
      // Representative filter
      const matchesRepresentative = selectedRepresentative === 'all' || 
        plan.user_id?.toString() === selectedRepresentative;
      
      return matchesSearch && matchesStatus && matchesRepresentative;
    });
  }, [visitPlans, searchTerm, selectedStatus, selectedRepresentative]);

  // Get representatives for filter dropdown
  const representatives = useMemo(() => {
    return users.filter(user => user.users_role === 'rep');
  }, [users]);

  const statusOptions = useMemo(() => ([
    { value: 'all', label: 'جميع الحالات' },
    { value: 'Active', label: 'نشطة' },
    { value: 'Paused', label: 'متوقفة' },
    { value: 'Inactive', label: 'غير نشطة' },
  ]), []);

  const representativeOptions = useMemo(() => ([
    { value: 'all', label: 'جميع المندوبين' },
    ...representatives.map((rep) => ({ value: rep.users_id?.toString() ?? '', label: rep.users_name })),
  ]), [representatives]);

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, [setSearchTerm, setCurrentPage]);

  const handleStatusChange = useCallback((value) => {
    setSelectedStatus(value || 'all');
    setCurrentPage(1);
  }, [setSelectedStatus, setCurrentPage]);

  const handleRepresentativeChange = useCallback((value) => {
    setSelectedRepresentative(value || 'all');
    setCurrentPage(1);
  }, [setSelectedRepresentative, setCurrentPage]);

  const handleItemsPerPageChange = useCallback((value) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  }, [setItemsPerPage, setCurrentPage]);

  const handleSortChange = useCallback((key, direction) => {
    setSortConfig({ key, direction });
  }, [setSortConfig]);

  const activeFilterChips = useMemo(() => {
    const chips = [];

    if (searchTerm) {
      chips.push({
        key: 'search',
        label: 'البحث',
        value: searchTerm,
        tone: 'blue',
        onRemove: () => handleSearchChange(''),
      });
    }

    if (selectedStatus !== 'all') {
      const statusLabel = statusOptions.find((opt) => opt.value === selectedStatus)?.label || selectedStatus;
      chips.push({
        key: 'status',
        label: 'الحالة',
        value: statusLabel,
        tone: 'green',
        onRemove: () => handleStatusChange('all'),
      });
    }

    if (selectedRepresentative !== 'all') {
      const representativeLabel = representativeOptions.find((opt) => opt.value === selectedRepresentative)?.label;
      chips.push({
        key: 'representative',
        label: 'المندوب',
        value: representativeLabel || selectedRepresentative,
        tone: 'purple',
        onRemove: () => handleRepresentativeChange('all'),
      });
    }

    return chips;
  }, [searchTerm, selectedStatus, selectedRepresentative, statusOptions, representativeOptions, handleSearchChange, handleStatusChange, handleRepresentativeChange]);

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
    setSelectedRepresentative('all');
    setCurrentPage(1);
  };

  // Setup refresh handler
  useEffect(() => {
    refreshDataRef.current = loadAllData;
    if (setChildRefreshHandler) {
      setChildRefreshHandler(() => loadAllData());
    }
    
    loadAllData();
  }, [loadAllData, setChildRefreshHandler]);

  // Reset form data
  const resetForm = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };

    // Get current day of week (1=Saturday to 7=Friday as per your schema)
    // JavaScript getDay() returns 0=Sunday, 1=Monday, etc.
    // We need to convert to your schema: 1=Saturday, 2=Sunday, 3=Monday, etc.
    const getCurrentDayForSchema = () => {
      const jsDay = today.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
      // Convert to your schema: Saturday=1, Sunday=2, Monday=3, etc.
      return jsDay === 6 ? 1 : jsDay + 2;
    };

    setFormData({
      visit_plan_name: '',
      visit_plan_description: '',
      user_id: '',
      visit_plan_status: 'Active',
      visit_plan_start_date: formatDate(today),
      visit_plan_end_date: formatDate(tomorrow),
      visit_plan_recurrence_type: 'Weekly',
      visit_plan_selected_days: [getCurrentDayForSchema()],
      visit_plan_repeat_every: 1
    });
    setFormErrors({});
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'visit_plan_selected_days') {
      const dayValue = parseInt(value);
      setFormData(prev => ({
        ...prev,
        visit_plan_selected_days: checked 
          ? [...prev.visit_plan_selected_days, dayValue]
          : prev.visit_plan_selected_days.filter(day => day !== dayValue)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseInt(value) || 1 : value
      }));
    }

    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.visit_plan_name.trim()) {
      errors.visit_plan_name = 'اسم الخطة مطلوب';
    }
    
    if (!formData.user_id) {
      errors.user_id = 'يجب اختيار المندوب';
    }
    
    if (formData.visit_plan_selected_days.length === 0) {
      errors.visit_plan_selected_days = 'يجب اختيار يوم واحد على الأقل';
    }
    
    if (formData.visit_plan_repeat_every < 1) {
      errors.visit_plan_repeat_every = 'يجب أن يكون التكرار أكبر من 0';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      let message;
      const submitData = {
        ...formData,
        visit_plan_selected_days: JSON.stringify(formData.visit_plan_selected_days)
      };

      if (currentView === 'add') {
        message = await addVisitPlan(submitData);
        setGlobalMessage({ type: 'success', message: message || 'تم إضافة خطة الزيارة بنجاح!' });
        
        // After successful creation, reload data to get the latest plans including the new one
  await loadAllData();
        
        // Try to find the newly created plan by matching name and user_id
        const updatedPlans = await getAllVisitPlans();
        const newPlan = updatedPlans.find(plan => 
          plan.visit_plan_name === formData.visit_plan_name && 
          plan.user_id === parseInt(formData.user_id)
        );
        
        // Navigate to assignments with the new plan ID if found
        if (newPlan) {
          navigate(`../assignments/${newPlan.visit_plan_id}`);
        } else {
          // Fallback to assignments without ID
          navigate('../assignments');
        }
        resetForm();
        return;
      } else if (currentView === 'edit') {
        // Debug: Check selectedPlan data
        
        if (!selectedPlan || !selectedPlan.visit_plan_id) {
          throw new Error('Selected plan or plan ID is missing');
        }
        
        message = await updateVisitPlan(selectedPlan.visit_plan_id, submitData);
        setGlobalMessage({ type: 'success', message: message || 'تم تحديث خطة الزيارة بنجاح!' });
      }

      setCurrentView('list');
      resetForm();
  await loadAllData();
    } catch (err) {
      console.error('Error submitting form:', err);
      setGlobalMessage({ type: 'error', message: err.message || 'فشل في حفظ خطة الزيارة' });
    } finally {
      setIsSubmitting(false);
    }
  };

    // Handle edit
  const handleEdit = async (plan) => {
    try {
      setLoading(true);
      const planDetails = await getVisitPlanDetail(plan.visit_plan_id);
      
      // Debug: Log the plan details
      
      // Parse selected days safely
      let selectedDays = [];
      if (planDetails.visit_plan_selected_days) {
        try {
          // If it's already an array, use it directly
          if (Array.isArray(planDetails.visit_plan_selected_days)) {
            selectedDays = planDetails.visit_plan_selected_days;
          } 
          // If it's a string, try to parse it
          else if (typeof planDetails.visit_plan_selected_days === 'string') {
            selectedDays = JSON.parse(planDetails.visit_plan_selected_days);
          }
          // Ensure it's an array
          if (!Array.isArray(selectedDays)) {
            selectedDays = [];
          }
        } catch (parseError) {
          console.error('Error parsing selected days:', parseError, planDetails.visit_plan_selected_days);
          selectedDays = [];
        }
      }
      
      // Helper function to format date for input field
      const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        try {
          const date = new Date(dateString);
          return date.toISOString().split('T')[0];
        } catch (error) {
          console.error('Error formatting date:', error, dateString);
          return '';
        }
      };
      
      
      setFormData({
        visit_plan_name: planDetails.visit_plan_name || '',
        visit_plan_description: planDetails.visit_plan_description || '',
        user_id: planDetails.user_id || '',
        visit_plan_status: planDetails.visit_plan_status || 'Active',
        visit_plan_start_date: formatDateForInput(planDetails.visit_plan_start_date),
        visit_plan_end_date: formatDateForInput(planDetails.visit_plan_end_date),
        visit_plan_recurrence_type: planDetails.visit_plan_recurrence_type || 'Weekly',
        visit_plan_selected_days: selectedDays,
        visit_plan_repeat_every: planDetails.visit_plan_repeat_every || 1
      });
      
      setSelectedPlan(planDetails);
      
      setCurrentView('edit');
    } catch (err) {
      console.error('Error loading plan details:', err);
      setGlobalMessage({ type: 'error', message: err.message || 'فشل في تحميل تفاصيل الخطة' });
    } finally {
      setLoading(false);
    }
  };

  // Handle view details
  const handleViewDetails = async (plan) => {
    try {
      setLoading(true);
      const planDetails = await getVisitPlanDetail(plan.visit_plan_id);
      setSelectedPlan(planDetails);
      setCurrentView('details');
    } catch (err) {
      console.error('Error loading plan details:', err);
      setGlobalMessage({ type: 'error', message: err.message || 'فشل في تحميل تفاصيل الخطة' });
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = (plan) => {
    setPlanToDelete(plan);
    setIsConfirmDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!planToDelete) return;

    // Debug: Check planToDelete data
    
    if (!planToDelete.visit_plan_id) {
      setGlobalMessage({ type: 'error', message: 'خطأ: معرف خطة الزيارة مفقود' });
      return;
    }

    setDeleteLoading(true);
    try {
      const message = await deleteVisitPlan(planToDelete.visit_plan_id);
      setGlobalMessage({ type: 'success', message: message || 'تم حذف خطة الزيارة بنجاح!' });
  await loadAllData();
    } catch (err) {
      console.error('Error deleting visit plan:', err);
      setGlobalMessage({ type: 'error', message: err.message || 'فشل في حذف خطة الزيارة' });
    } finally {
      setDeleteLoading(false);
      setIsConfirmDeleteModalOpen(false);
      setPlanToDelete(null);
    }
  };

  // Get user name by ID
  const getUserName = useCallback((userId) => {
    const user = users.find(u => u.users_id === userId);
    return user ? user.users_name : 'غير محدد';
  }, [users]);

  // Format selected days
  const formatSelectedDays = (days) => {
    if (!days) return 'غير محدد';
    
    try {
      // If it's already an array, use it directly
      let daysArray = days;
      
      // If it's a string, try to parse it
      if (typeof days === 'string') {
        daysArray = JSON.parse(days);
      }
      
      // Validate it's an array and has content
      if (!Array.isArray(daysArray) || daysArray.length === 0) {
        return 'غير محدد';
      }
      
      // Map day numbers to names and join
      return daysArray.map(day => dayNames[day] || day).join(', ');
    } catch (error) {
      console.error('Error formatting selected days:', error, days);
      return 'غير محدد';
    }
  };

  const sortedVisitPlans = useMemo(() => {
    const data = [...filteredVisitPlans];
    if (!sortConfig?.key) return data;

    const getComparableValue = (plan) => {
      switch (sortConfig.key) {
        case 'representative':
          return getUserName(plan.user_id) || '';
        case 'clients_count':
          return Number(plan.clients_count) || 0;
        case 'visit_plan_repeat_every':
          return Number(plan.visit_plan_repeat_every) || 0;
        case 'visit_plan_status':
          return plan.visit_plan_status || '';
        case 'visit_plan_start_date':
        case 'visit_plan_end_date':
        case 'visit_plan_name':
          return plan[sortConfig.key] || '';
        default:
          return plan[sortConfig.key] ?? '';
      }
    };

    return data.sort((a, b) => {
      const aValue = getComparableValue(a);
      const bValue = getComparableValue(b);

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aString = aValue == null ? '' : String(aValue).toLowerCase();
      const bString = bValue == null ? '' : String(bValue).toLowerCase();

      if (aString < bString) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aString > bString) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredVisitPlans, sortConfig, getUserName]);

  const totalFilteredPlans = sortedVisitPlans.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredPlans / itemsPerPage));

  useEffect(() => {
    setCurrentPage((prev) => {
      if (prev > totalPages) return totalPages;
      if (prev < 1) return 1;
      return prev;
    });
  }, [totalPages]);

  const paginatedVisitPlans = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedVisitPlans.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedVisitPlans, currentPage, itemsPerPage]);

  const totalPlansCount = visitPlans.length;

  const tableColumns = [
    {
      key: 'index',
      title: '#',
      align: 'center',
      headerAlign: 'center',
      render: (_, index) => (
        <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-semibold">
          {(currentPage - 1) * itemsPerPage + index + 1}
        </span>
      ),
    },
    {
      key: 'visit_plan_name',
      title: 'الخطة',
      sortable: true,
      render: (plan) => (
        <div className="space-y-1">
          <div className="font-bold text-blue-800 leading-snug line-clamp-2">
            {plan.visit_plan_name || '—'}
          </div>
          <div className="text-sm text-gray-700">{getUserName(plan.user_id) || 'غير معروف'}</div>
          {plan.visit_plan_description && (
            <div className="text-xs text-gray-500 line-clamp-1">
              {plan.visit_plan_description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'visit_plan_dates',
      title: 'التاريخ',
      sortable: true,
      render: (plan) => (
        <div className="text-sm text-gray-600 space-y-0.5">
          <div>من: <span className="font-medium">{plan.visit_plan_start_date || 'غير محدد'}</span></div>
          <div>إلى: <span className="font-medium">{plan.visit_plan_end_date || 'غير محدد'}</span></div>
        </div>
      ),
    },
    {
      key: 'visit_plan_repeat_every',
      title: 'التكرار',
      sortable: true,
      align: 'center',
      headerAlign: 'center',
      render: (plan) => (
        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-semibold">
          كل {plan.visit_plan_repeat_every || 0} أسبوع
        </span>
      ),
    },
    {
      key: 'visit_plan_selected_days',
      title: 'الأيام المحددة',
      render: (plan) => (
        <div className="text-xs text-gray-600 leading-snug line-clamp-2">
          {formatSelectedDays(plan.visit_plan_selected_days)}
        </div>
      ),
    },
    {
      key: 'clients_count',
      title: 'العملاء',
      sortable: true,
      align: 'center',
      headerAlign: 'center',
      render: (plan) => (
        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-semibold">
          {plan.clients_count || 0}
        </span>
      ),
    },
    {
      key: 'visit_plan_status',
      title: 'الحالة',
      sortable: true,
      align: 'center',
      headerAlign: 'center',
      render: (plan) => {
        const isActive = plan.visit_plan_status === 'Active';
        return (
          <span className={`font-semibold text-xs px-2 py-1 rounded-full ${isActive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {isActive ? 'نشطة' : 'متوقفة'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      title: 'الإجراءات',
      align: 'center',
      headerAlign: 'center',
      render: (plan) => (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => handleViewDetails(plan)}
            className="group p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-full transition-all"
            title="عرض"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleEdit(plan)}
            className="group p-1.5 text-green-600 hover:text-white hover:bg-green-600 rounded-full transition-all"
            title="تعديل"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(plan)}
            className="group p-1.5 text-red-600 hover:text-white hover:bg-red-600 rounded-full transition-all"
            title="حذف"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  // Render form (Add/Edit)
  if (currentView === 'add' || currentView === 'edit') {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold text-gray-800">
            {currentView === 'add' ? 'إضافة خطة زيارة جديدة' : 'تعديل خطة الزيارة'}
          </h3>
          <Button
            variant="secondary"
            onClick={() => {
              setCurrentView('list');
              resetForm();
            }}
          >
            إلغاء
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Plan Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم خطة الزيارة *
              </label>
              <input
                type="text"
                name="visit_plan_name"
                value={formData.visit_plan_name}
                onChange={handleInputChange}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  formErrors.visit_plan_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="أدخل اسم خطة الزيارة"
                required
              />
              {formErrors.visit_plan_name && (
                <p className="text-red-500 text-sm mt-1">{formErrors.visit_plan_name}</p>
              )}
            </div>

            {/* Representative */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المندوب *
              </label>
              <select
                name="user_id"
                value={formData.user_id}
                onChange={handleInputChange}
                disabled={currentView === 'edit'}
                title={currentView === 'edit' ? 'لا يمكن تعديل اسم المندوب عند التعديل' : ''}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  formErrors.user_id ? 'border-red-500' : 'border-gray-300'
                } ${currentView === 'edit' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                required
              >
                <option value="">اختر المندوب</option>
                {users.filter(user => user.users_role === 'rep').map(user => (
                  <option key={user.users_id} value={user.users_id}>
                    {user.users_name}
                  </option>
                ))}
              </select>
              {formErrors.user_id && (
                <p className="text-red-500 text-sm mt-1">{formErrors.user_id}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              وصف الخطة
            </label>
            <textarea
              name="visit_plan_description"
              value={formData.visit_plan_description}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="3"
              placeholder="أدخل وصف خطة الزيارة"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                حالة الخطة
              </label>
              <select
                name="visit_plan_status"
                value={formData.visit_plan_status}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Active">نشطة</option>
                <option value="Paused">متوقفة</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاريخ البداية
              </label>
              <input
                type="date"
                name="visit_plan_start_date"
                value={formData.visit_plan_start_date}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاريخ النهاية
              </label>
              <input
                type="date"
                name="visit_plan_end_date"
                value={formData.visit_plan_end_date}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recurrence Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نوع التكرار
              </label>
              <select
                name="visit_plan_recurrence_type"
                value={formData.visit_plan_recurrence_type}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Weekly">أسبوعي</option>
              </select>
            </div>

            {/* Repeat Every */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                التكرار كل (أسابيع)
              </label>
              <NumberInput
                name="visit_plan_repeat_every"
                value={formData.visit_plan_repeat_every}
                onChange={(val)=> handleInputChange({ target: { name: 'visit_plan_repeat_every', value: val } })}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  formErrors.visit_plan_repeat_every ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.visit_plan_repeat_every && (
                <p className="text-red-500 text-sm mt-1">{formErrors.visit_plan_repeat_every}</p>
              )}
            </div>
          </div>

          {/* Selected Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              الأيام المحددة *
            </label>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {Object.entries(dayNames).map(([dayValue, dayName]) => (
                  <label 
                    key={dayValue} 
                    className={`relative flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                      formData.visit_plan_selected_days.includes(parseInt(dayValue))
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="visit_plan_selected_days"
                      value={dayValue}
                      checked={formData.visit_plan_selected_days.includes(parseInt(dayValue))}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 mb-2 flex items-center justify-center ${
                      formData.visit_plan_selected_days.includes(parseInt(dayValue))
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {formData.visit_plan_selected_days.includes(parseInt(dayValue)) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium text-center">{dayName}</span>
                  </label>
                ))}
              </div>
              <div className="mt-3 text-xs text-gray-500 text-center">
                اضغط على الأيام التي تريد تضمينها في خطة الزيارة
              </div>
            </div>
            {formErrors.visit_plan_selected_days && (
              <p className="text-red-500 text-sm mt-2 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {formErrors.visit_plan_selected_days}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3 rtl:space-x-reverse">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCurrentView('list');
                resetForm();
              }}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              {currentView === 'add' ? 'إضافة الخطة' : 'حفظ التغييرات'}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // Render details view
  if (currentView === 'details' && selectedPlan) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold text-gray-800">تفاصيل خطة الزيارة</h3>
          <Button
            variant="secondary"
            onClick={() => setCurrentView('list')}
          >
            العودة للقائمة
          </Button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">اسم الخطة</label>
              <p className="text-lg font-semibold text-gray-800">{selectedPlan.visit_plan_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">المندوب</label>
              <p className="text-lg font-semibold text-gray-800">{getUserName(selectedPlan.user_id)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">الحالة</label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                selectedPlan.visit_plan_status === 'Active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {selectedPlan.visit_plan_status === 'Active' ? 'نشطة' : 'متوقفة'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">نوع التكرار</label>
              <p className="text-lg font-semibold text-gray-800">
                أسبوعي
              </p>
            </div>
            {selectedPlan.visit_plan_start_date && (
              <div>
                <label className="block text-sm font-medium text-gray-500">تاريخ البداية</label>
                <p className="text-lg font-semibold text-gray-800">{selectedPlan.visit_plan_start_date}</p>
              </div>
            )}
            {selectedPlan.visit_plan_end_date && (
              <div>
                <label className="block text-sm font-medium text-gray-500">تاريخ النهاية</label>
                <p className="text-lg font-semibold text-gray-800">{selectedPlan.visit_plan_end_date}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-500">التكرار كل (أسابيع)</label>
              <p className="text-lg font-semibold text-gray-800">{selectedPlan.visit_plan_repeat_every}</p>
            </div>
            {selectedPlan.visit_plan_selected_days && (
              <div>
                <label className="block text-sm font-medium text-gray-500">الأيام المحددة</label>
                <p className="text-lg font-semibold text-gray-800">
                  {formatSelectedDays(selectedPlan.visit_plan_selected_days)}
                </p>
              </div>
            )}
          </div>
          
          {selectedPlan.visit_plan_description && (
            <div>
              <label className="block text-sm font-medium text-gray-500">الوصف</label>
              <p className="text-gray-800">{selectedPlan.visit_plan_description}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render list view
  return (
    <div className="p-6 space-y-6" dir="rtl">
      <CustomPageHeader
        title="خطط الزيارات"
        subtitle="إدارة وتتبع خطط الزيارات للمندوبين"
        icon={<CalendarDaysIcon className="h-8 w-8 text-white" />}
        statValue={totalPlansCount}
        statLabel="إجمالي الخطط"
        actionButton={(
          <button
            type="button"
            onClick={() => {
              resetForm();
              setCurrentView('add');
            }}
            className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg font-bold"
            disabled={loading}
          >
            <PlusIcon className="h-5 w-5" />
            إضافة خطة جديدة
          </button>
        )}
      />

      <FilterBar
        title="أدوات البحث والفلاتر"
        searchConfig={{
          value: searchTerm,
          onChange: handleSearchChange,
          onClear: () => handleSearchChange(''),
          placeholder: 'ابحث عن خطة أو وصف أو مندوب',
          searchWhileTyping: true,
        }}
        selectFilters={[
          {
            key: 'status',
            value: selectedStatus,
            onChange: handleStatusChange,
            options: statusOptions,
            placeholder: 'حالة الخطة',
          },
          {
            key: 'representative',
            value: selectedRepresentative,
            onChange: handleRepresentativeChange,
            options: representativeOptions,
            placeholder: 'المندوب المسؤول',
          },
        ]}
        activeChips={activeFilterChips}
        onClearAll={activeFilterChips.length ? clearFilters : null}
      />

      <PaginationHeaderFooter
        total={totalFilteredPlans}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
        onFirst={() => setCurrentPage(1)}
        onPrev={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
        onNext={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
        onLast={() => setCurrentPage(totalPages)}
        loading={loading}
      />

      <GlobalTable
        data={paginatedVisitPlans}
        loading={loading}
        error={error}
        columns={tableColumns}
        rowKey="visit_plan_id"
        totalCount={totalFilteredPlans}
        searchTerm={searchTerm}
        emptyState={{
          icon: '📅',
          title: 'لا توجد خطط زيارات لعرضها',
          description: 'جرب تعديل الفلاتر أو إضافة خطة زيارة جديدة',
        }}
        initialSort={sortConfig}
        onSort={handleSortChange}
        showSummary
      />

      <PaginationHeaderFooter
        total={totalFilteredPlans}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
        onFirst={() => setCurrentPage(1)}
        onPrev={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
        onNext={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
        onLast={() => setCurrentPage(totalPages)}
        loading={loading}
      />

      <Modal 
        isOpen={isConfirmDeleteModalOpen} 
        onClose={() => setIsConfirmDeleteModalOpen(false)} 
        title="تأكيد الحذف"
      >
        <div dir="rtl">
          <p className="mb-4 text-gray-700">
            هل أنت متأكد أنك تريد حذف خطة الزيارة "{planToDelete?.visit_plan_name}"؟
            لا يمكن التراجع عن هذا الإجراء.
          </p>
          <div className="flex justify-end space-x-3 rtl:space-x-reverse">
            <Button
              variant="secondary"
              onClick={() => setIsConfirmDeleteModalOpen(false)}
              disabled={deleteLoading}
            >
              إلغاء
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              disabled={deleteLoading}
              isLoading={deleteLoading}
            >
              حذف
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default VisitPlansTab;
