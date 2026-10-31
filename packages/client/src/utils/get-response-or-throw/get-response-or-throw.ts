export const getResponseOrThrow = async (response: Response): Promise<Response> => {
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.reason || 'Server Error');
  }
  return response;
};
