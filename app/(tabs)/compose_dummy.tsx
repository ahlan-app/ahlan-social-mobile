// Ahlan Social — https://github.com/sametyilmaztemel/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
// Coded by Samet Yilmaz Temel
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

import { Redirect } from 'expo-router';

// This screen is never shown — tab press is intercepted in _layout.tsx
// and redirects to the /compose modal. This file exists only to satisfy
// expo-router's file-based routing requirement.
export default function ComposeDummy() {
  return <Redirect href="/compose" />;
}
