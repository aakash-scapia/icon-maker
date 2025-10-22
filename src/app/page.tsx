import ClientUI from "./client-ui";
import { iconifyAction } from "./actions/iconify";

export default function Page() {
  return <ClientUI action={iconifyAction} />;
}
