import UserList from "../islands/user_list";
import { Island } from "noxt";
import { h } from "preact";

export default function ApiTestPage() {
  return (
    <div>
      <h1>API E2E Test Page</h1>
      <Island component={UserList} props={{}} />
    </div>
  );
}