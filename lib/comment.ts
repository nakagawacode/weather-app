type CommentRequest = {
  temperature: number;
  weather: number;
};

type CommentResponse = {
  message: string;
};

export const fetchComment = async (
  payload: CommentRequest
): Promise<CommentResponse> => {
  const res = await fetch("/api/comment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("API error");
  }

  return await res.json();
};
