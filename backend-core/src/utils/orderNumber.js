const generateOrderNumber = () => {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `QC-${yyyy}${mm}${dd}-${randomStr}`;
  };
  
  module.exports = { generateOrderNumber };