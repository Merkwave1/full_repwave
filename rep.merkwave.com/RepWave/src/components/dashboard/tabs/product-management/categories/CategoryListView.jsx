import React from "react";
import { PencilIcon, TrashIcon, EyeIcon } from "@heroicons/react/24/outline";
import Loader from "../../../../common/Loader/Loader";
import Alert from "../../../../common/Alert/Alert";
import GlobalTable from "../../../../common/GlobalTable/GlobalTable";

export default function CategoryListView({
  categories,
  loading,
  error,
  searchTerm = "",
  onEditClick,
  onViewClick,
  onDeleteClick,
}) {
  const columns = [
    {
      key: "__idx",
      title: "#",
      headerAlign: "center",
      align: "center",
      render: (item, idx) => (
        <span className="bg-blue-100 text-[#1F2937] text-xs px-2 py-1 rounded-full font-semibold">
          {idx + 1}
        </span>
      ),
      className: "w-16",
      showDivider: true,
    },
    {
      key: "categories_name",
      title: "اسم الفئة",
      sortable: true,
      render: (item) => (
        <div
          className="line-clamp-2"
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            wordBreak: "break-word",
          }}
        >
          {item.categories_name}
        </div>
      ),
      className: "min-w-[200px]",
    },
    {
      key: "categories_description",
      title: "الوصف",
      render: (item) =>
        item.categories_description ? (
          <div
            className="line-clamp-2"
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              wordBreak: "break-word",
            }}
          >
            {item.categories_description}
          </div>
        ) : (
          <span className="text-gray-400 italic">لا يوجد وصف</span>
        ),
      className: "min-w-[250px]",
    },
    {
      key: "actions",
      title: "الإجراءات",
      align: "center",
      headerAlign: "center",
      render: (item) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewClick(item);
            }}
            className="p-1.5 rounded-full 
                   text-sky-700 bg-sky-100
                   hover:bg-sky-500 hover:text-white
                   hover:shadow-[0_0_12px_rgba(56,189,248,0.45)]
                   transition-all duration-200 hover:scale-110"
            title="عرض"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditClick(item);
            }}
            className="p-1.5 rounded-full 
                   text-emerald-700 bg-emerald-100
                   hover:bg-emerald-500 hover:text-white
                   hover:shadow-[0_0_12px_rgba(16,185,129,0.45)]
                   transition-all duration-200 hover:scale-110"
            title="تعديل"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick(item);
            }}
            className="p-1.5 rounded-full 
                   text-red-700 bg-red-100
                   hover:bg-red-500 hover:text-white
                   hover:shadow-[0_0_12px_rgba(239,68,68,0.45)]
                   transition-all duration-200 hover:scale-110"
            title="حذف"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
      className: "w-32",
    },
  ];

  return (
    <>
      {loading && <Loader className="mt-8" />}
      {error && <Alert message={error} type="error" className="mb-4" />}

      <GlobalTable
        data={categories}
        loading={loading}
        error={error}
        columns={columns}
        rowKey="categories_id"
        searchTerm={searchTerm}
        totalCount={Array.isArray(categories) ? categories.length : null}
        emptyState={{
          icon: "📂",
          title: "لا توجد فئات للعرض",
          description: "جرب البحث بكلمات مختلفة أو أضف فئة جديدة",
        }}
      />
    </>
  );
}
