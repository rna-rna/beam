const fetchGalleries = async (folderId?: number) => {
  let url = '/api/galleries';
  
  // If folderId is provided, add it as a query parameter
  if (folderId) {
    url = `${url}?folderId=${folderId}`;
  }
  
  const res = await fetch(url);
  
  if (!res.ok) {
    throw new Error('Failed to fetch galleries');
  }
  
  return res.json();
}; 