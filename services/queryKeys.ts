// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Central TanStack Query keys. Viewer-specific lists include the viewer id so
// cached data can never leak between accounts on the same device.

export const queryKeys = {
  feed: (viewerId: string) => ['feed', viewerId] as const,
  stories: (viewerId: string) => ['stories', viewerId] as const,
  suggestions: (viewerId: string) => ['suggestions', viewerId] as const,
  profile: (username: string) => ['profile', username.trim().toLowerCase()] as const,
  userPosts: (userId: string) => ['userPosts', userId] as const,
  userReposts: (userId: string) => ['userReposts', userId] as const,
  followCounts: (userId: string) => ['followCounts', userId] as const,
  post: (postId: string) => ['post', postId] as const,
  postOwner: (postId: string) => ['postOwner', postId] as const,
  comments: (postId: string) => ['comments', postId] as const,
  trending: () => ['trending'] as const,
  userSearch: (term: string) => ['userSearch', term.trim().toLowerCase()] as const,
  userList: (type: string, id: string) => ['userList', type, id] as const,
  chatList: (viewerId: string) => ['chatList', viewerId] as const,
};

/** Query key roots that are never written to disk (private messages). */
export const NON_PERSISTED_ROOTS = new Set<string>(['chatList']);
