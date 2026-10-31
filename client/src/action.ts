export function setupAction(element: HTMLButtonElement) {
  const action = "action is not set";
  element.innerHTML = `${action}`;

  const setAction = () => {
    const action = "action triggered";
    element.innerHTML = `${action}`;
  };

  element.addEventListener("click", () => setAction());
}