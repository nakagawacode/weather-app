export const fetchComment = async (payload: any) => {
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