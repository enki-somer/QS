// Project categories based on project_categories.md
export interface ProjectCategory {
  id: string;
  name: string;
  subcategories: string[];
}

export const PROJECT_CATEGORIES: ProjectCategory[] = [
  {
    id: 'implementation_construction',
    name: 'أعمال تنفيذية وإنشائية',
    subcategories: [
      'تنفيذ الهدم والحفر',
      'تنفيذ اللبخ',
      'تنفيذ الصبغ',
      'تنفيذ الكهربائية',
      'تنفيذ المجاري والصحيات',
      'تنفيذ البورسلان',
      'تنفيذ المرمر',
      'تنفيذ البلوك والطابوق',
      'تنفيذ الكامرات',
      'تنفيذ الديكور والجبس بورد',
      'تنفيذ النجارة والحدادة',
      'تنفيذ الجص والبورك',
      'تنفيذ الجلي',
      'تنفيذ التنظيف',
      'تنفيذ الحدادة',
      'تنفيذ السكرت'
    ]
  },
  {
    id: 'materials_supply',
    name: 'تجهيز مواد البناء والتشطيب',
    subcategories: [
      'تجهيز مادة الكونكريت',
      'تجهيز مادة الاسمنت',
      'تجهيز مادة البلوك والطابوق',
      'تجهيز مادة البورسلان',
      'تجهيز مادة المرمر',
      'تجهيز مادة الحديد (شيش)',
      'تجهيز المواد الكهربائية',
      'تجهيز المواد العازلة',
      'تجهيز مادة الرمل'
    ]
  },
  {
    id: 'specialized_works',
    name: 'أعمال متخصصة وتنفيذ متكامل',
    subcategories: [
      'تجهيز وتنفيذ الألمنيوم الداخلية والأبواب',
      'تجهيز وتنفيذ الواجهة',
      'تجهيز وتنفيذ المصاعد',
      'تجهيز وتنفيذ محولة الكهرباء',
      'أعمال الإطفاء'
    ]
  },
  {
    id: 'administrative_operational',
    name: 'مصاريف إدارية وتشغيلية',
    subcategories: [
      'رواتب ومصاريف العمال',
      'رواتب ومصاريف الفورمنية'
    ]
  }
];

// Helper function to get subcategories by main category ID
export const getSubcategoriesByCategory = (categoryId: string): string[] => {
  const category = PROJECT_CATEGORIES.find(cat => cat.id === categoryId);
  return category?.subcategories || [];
};

// Helper function to get category name by ID
export const getCategoryNameById = (categoryId: string): string => {
  const category = PROJECT_CATEGORIES.find(cat => cat.id === categoryId);
  return category?.name || '';
};

// Helper function to get category ID by name
export const getCategoryIdByName = (categoryName: string): string => {
  const category = PROJECT_CATEGORIES.find(cat => cat.name === categoryName);
  return category?.id || '';
};

// Helper function to get all category names
export const getAllCategoryNames = (): string[] => {
  return PROJECT_CATEGORIES.map(cat => cat.name);
};

// Helper function to get all subcategories across all categories
export const getAllSubcategories = (): string[] => {
  return PROJECT_CATEGORIES.flatMap(cat => cat.subcategories);
};