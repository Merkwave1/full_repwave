// src/components/common/SearchableSelect/SearchableSelect.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

/**
 * A reusable Searchable Select/Dropdown component.
 * @param {Object} props - The component props.
 * @param {Array<Object>} props.options - An array of objects, each with a `value` and `label` property.
 * @param {string|number} props.value - The currently selected value.
 * @param {function(string|number): void} props.onChange - Callback function when a new option is selected.
 * @param {string} props.placeholder - Placeholder text for the dropdown.
 * @param {string} [props.className] - Additional CSS classes for the main wrapper.
 * @param {function} [props.renderOption] - Custom function to render each option.
 * @param {boolean} [props.disabled] - Whether the component is disabled.
 */
const SearchableSelect = ({ options = [], value, onChange, placeholder, className = '', renderOption, disabled = false }) => {
    // Ensure value is always consistent (handle undefined, null, empty string)
    const normalizedValue = value || '';
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, placement: 'bottom' });
    const wrapperRef = useRef(null);
    const dropdownRef = useRef(null);

    // Calculate dropdown position based on available space
    const calculateDropdownPosition = () => {
        if (!wrapperRef.current) return;
        
        const rect = wrapperRef.current.getBoundingClientRect();
        const margin = 4; // 4px margin below the select
        
        // Always position below the select button
        let top = rect.bottom + window.scrollY + margin;
        
        // Ensure dropdown doesn't go off-screen horizontally
        const windowWidth = window.innerWidth;
        let left = rect.left + window.scrollX;
        
        // If dropdown would go off the right edge, adjust it
        if (left + rect.width > windowWidth) {
            left = windowWidth - rect.width - 10; // 10px margin from edge
        }
        
        // Ensure it doesn't go off the left edge
        left = Math.max(10, left);
        
        setDropdownPosition({
            top: top,
            left: left,
            width: rect.width,
            placement: 'bottom'
        });
    };

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target) &&
            dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', calculateDropdownPosition);
        window.addEventListener('resize', calculateDropdownPosition);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', calculateDropdownPosition);
            window.removeEventListener('resize', calculateDropdownPosition);
        };
    }, []);

    // Calculate position when opening dropdown
    useEffect(() => {
        if (isOpen) {
            calculateDropdownPosition();
            // Recalculate position on scroll/resize while open
            const handleReposition = () => {
                if (isOpen) {
                    calculateDropdownPosition();
                }
            };
            window.addEventListener('scroll', handleReposition, true);
            window.addEventListener('resize', handleReposition);
            return () => {
                window.removeEventListener('scroll', handleReposition, true);
                window.removeEventListener('resize', handleReposition);
            };
        }
    }, [isOpen]);

    // Filter options based on search term
    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(option =>
            option.label && option.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm]);

    // Determine the label for the currently selected value
    const selectedOptionLabel = normalizedValue === ''
        ? placeholder // Always show placeholder (filter name) when no selection (even if an 'all' option exists)
        : (options.find(opt => opt.value === normalizedValue)?.label || placeholder);

    // Handle button click to toggle dropdown
    const handleButtonClick = () => {
        if (disabled) return;
        
        if (!isOpen) {
            // Small delay to ensure DOM is ready for position calculation
            setTimeout(() => {
                setIsOpen(true);
            }, 10);
        } else {
            setIsOpen(false);
        }
    };

    // Handle option selection
    const handleOptionClick = (optionValue) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm(''); // Clear search term after selection
    };

    const getDropdownClasses = () => {
        return "fixed z-[10000] bg-white shadow-2xl rounded-xl border-2 border-gray-200 max-h-80 overflow-y-auto";
    };

    const getDropdownStyle = () => {
        return {
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            zIndex: 10000
        };
    };

    return (
        <div className={`relative ${className}`} ref={wrapperRef} dir="rtl">
            {/* Button to toggle dropdown visibility */}
            <button
                type="button"
                className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-100 sm:text-sm text-right flex justify-between items-center transition-all duration-200 ${
                    disabled 
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                        : 'bg-white hover:border-blue-300 hover:shadow-md'
                }`}
                onClick={handleButtonClick}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                disabled={disabled}
            >
                {selectedOptionLabel}
                <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>

            {/* Dropdown content (search input and options list) - Portaled to body */}
            {isOpen && !disabled && createPortal(
                <div 
                    ref={dropdownRef}
                    className={getDropdownClasses()}
                    style={getDropdownStyle()}
                    dir="rtl"
                >
                    <div className="p-3">
                        <input
                            type="text"
                            placeholder="بحث..."
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()} // Prevent closing dropdown when clicking search input
                            dir="rtl"
                        />
                    </div>
                    <ul className="py-1" role="listbox">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(option => (
                                <li
                                    key={option.value}
                                    className="px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-800 cursor-pointer border-b border-gray-100 last:border-b-0 transition-all duration-200"
                                    onClick={() => handleOptionClick(option.value)}
                                    role="option"
                                    aria-selected={option.value === normalizedValue}
                                >
                                    {renderOption ? renderOption(option) : option.label}
                                </li>
                            ))
                        ) : (
                            <li className="px-3 py-2 text-sm text-gray-500 text-center">لا توجد خيارات مطابقة</li>
                        )}
                    </ul>
                </div>,
                document.body
            )}
        </div>
    );
};

export default SearchableSelect;
