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
import {
  SSRRoute,
  type SSRHandler,
  type IMutationRouteBuilder,
  type IQueryRouteBuilder,
} from "./types";
import {
  body,
  searchParams,
  type Schema,
  type SearchParams,
  type SearchParamSchema,
} from "../core/superstruct";
import * as s from "superstruct";
import { renderToHtmlString } from "../core/render";
import { h } from "preact";

class QueryRouteBuilder<
  TInput extends SearchParams,
> implements IQueryRouteBuilder<TInput> {
  constructor(private __input: SearchParamSchema<TInput>) {}

  input<TInput2 extends SearchParams>(
    Input: SearchParamSchema<TInput2>,
  ): IQueryRouteBuilder<TInput2> {
    return new QueryRouteBuilder(Input);
  }

  get _input(): Schema<TInput> {
    return this.__input;
  }

  route(fn: SSRHandler<TInput>): SSRRoute<TInput> {
    return new SSRRoute(this.__input, async (request) => {
      try {
        const params = new URL(request.url).searchParams;
        const inputData = s.create(params, searchParams(this.__input));

        try {
          const response: ResponseInit = {
            headers: { "Content-Type": "application/html" },
          };
          const result = await fn({ input: inputData, request, response });
          const htmlBody = await renderToHtmlString(h(() => result, {}));
          return new Response(htmlBody, response);
        } catch (err) {
          console.error(err);
          return new Response("Internal Server Error", { status: 500 });
        }
      } catch (err) {
        console.error(err);
        return new Response("Bad argument", { status: 400 });
      }
    });
  }
}

export function query(): IQueryRouteBuilder<{}> {
  return new QueryRouteBuilder(s.object({}));
}

class MutationRouteBuilder<TInput> implements IMutationRouteBuilder<TInput> {
  constructor(private __input: Schema<TInput>) {}

  input<TInput2>(Input: Schema<TInput2>): IMutationRouteBuilder<TInput2> {
    return new MutationRouteBuilder(Input);
  }

  get _input(): Schema<TInput> {
    return this.__input;
  }

  route(fn: SSRHandler<TInput>): SSRRoute<TInput> {
    return new SSRRoute(this.__input, async (request) => {
      try {
        const data = await request.text();
        const inputData = s.create(data, body(this.__input));

        try {
          const response: ResponseInit = {
            headers: { "Content-Type": "application/html" },
          };
          const result = await fn({ input: inputData, request, response });
          const htmlBody = await renderToHtmlString(h(() => result, {}));
          return new Response(htmlBody, response);
        } catch {
          return new Response("Internal Server Error", { status: 500 });
        }
      } catch {
        return new Response("Bad argument", { status: 400 });
      }
    });
  }
}

export function mutation(): IMutationRouteBuilder<null> {
  return new MutationRouteBuilder(s.literal(null));
}
