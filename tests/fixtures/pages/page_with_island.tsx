import Counter from "../islands/counter";
import { Island } from "noxt";
import { h } from "preact";

export default function IslandPage() {
  return (
    <Island component={Counter} props={{ initialValue: 4, date: new Date() }} />
  );
}
