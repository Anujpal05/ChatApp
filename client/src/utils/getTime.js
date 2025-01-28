const getMessageTime = (timestamp) => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours + ":" + minutes}`;
};

export const getDate = (timestamp) => {
  const date = new Date(timestamp);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  return `${day.toString().padStart(2, 0)}-${month
    .toString()
    .padStart(2, 0)}-${year}`;
};

export const isToday = (date) => {
  const inputDate = new Date(date);
  const today = new Date();

  return inputDate.toDateString() === today.toDateString();
};

export const isYesterDay = (date) => {
  const inputDate = new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return inputDate.toDateString() === yesterday.toDateString();
};

export default getMessageTime;
