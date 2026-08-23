import { useState } from "preact/hooks";
import { h, Fragment } from "preact";
import type { ApiRoutes } from "../.cache/api";
import { BASE } from "../.cache/utils";
import { ApiRouter, useApi } from "noxt/runtime";

const router = new ApiRouter<ApiRoutes>(BASE);

function UserList() {
  const [userId, setUserId] = useState("1");
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");

  const {
    data: user,
    loading,
    error,
    refresh,
  } = useApi(router.api("/api/users", "GET"), { id: userId });

  const createUser = async () => {
    const createUserApi = router.api("/api/users", "POST");
    const newUser = await createUserApi({
      name: createName,
      email: createEmail,
    });
    setUserId(newUser.id);
    setCreateName("");
    setCreateEmail("");
  };

  return (
    <Fragment>
      <h2>User List (API Test)</h2>
      <div>
        <label>
          User ID:
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target!.value)}
          />
        </label>
      </div>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>Error: {error.message}</p>}
      {user && (
        <div>
          <p>ID: {user.id}</p>
          <p>Name: {user.name}</p>
          <p>Email: {user.email}</p>
          <button onClick={refresh}>Refresh</button>
        </div>
      )}

      <hr />
      <h3>Create User</h3>
      <div>
        <label>
          Name:
          <input
            type="text"
            value={createName}
            onChange={(e) => setCreateName(e.target!.value)}
          />
        </label>
      </div>
      <div>
        <label>
          Email:
          <input
            type="email"
            value={createEmail}
            onChange={(e) => setCreateEmail(e.target!.value)}
          />
        </label>
      </div>
      <button onClick={createUser}>Create User</button>
    </Fragment>
  );
}

export default UserList;
