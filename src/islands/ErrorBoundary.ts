/**
 * Copyright 2026 Luc BILLAUD
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 **/
import { Component, type ComponentChildren } from "preact";

interface IslandErrorBoundaryProps {
  children: ComponentChildren;
  name?: string;
}

interface IslandErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches errors thrown by an island component during server-side rendering
 * (e.g. browser-only features such as `window` or `document`). When an error
 * is caught the island renders nothing, so the client hydrates it in
 * client-only mode instead of failing the whole page.
 */
export class IslandErrorBoundary extends Component<
  IslandErrorBoundaryProps,
  IslandErrorBoundaryState
> {
  override state: IslandErrorBoundaryState = { hasError: false };

  override componentDidCatch(error: unknown) {
    console.warn(
      `Island "${this.props.name ?? "unknown"}" failed during prerendering, ` +
        "falling back to client-only mode.\n",
      error instanceof Error ? error.message : String(error),
    );
    this.setState({ hasError: true });
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
