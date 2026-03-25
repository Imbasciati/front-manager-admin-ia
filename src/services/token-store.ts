let accessTokenMemory: string | null = null;

export const getAccessToken = () => accessTokenMemory;
export const setAccessToken = (token: string | null) => {
  accessTokenMemory = token;
};

