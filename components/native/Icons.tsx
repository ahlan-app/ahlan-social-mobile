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

import React from 'react';
import Svg, { Path, Circle, G, Rect } from 'react-native-svg';

export interface IconProps {
  color?: string;
  size?: number;
}

export interface ToggleIconProps extends IconProps {
  liked?: boolean;
  saved?: boolean;
}

export const AhlanIcon: React.FC<IconProps> = ({ color = "#fff", size = 32 }) => (
  <Svg width={size} height={size} fill="none" viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.6" />
    <Circle cx="12" cy="12" r="6" stroke={color} strokeWidth="1.6" />
    <Path d="M 12 2 Q 20 7 18 12" stroke={color} strokeWidth="1.6" fill="none" />
    <Path d="M 12 22 Q 4 17 6 12" stroke={color} strokeWidth="1.6" fill="none" />
    <G>
      <Path
        d="M11.25 9.5 H12.75 V11.25 H14.5 V12.75 H12.75 V14.5 H11.25 V12.75 H9.5 V11.25 H11.25 V9.5 Z"
        fill="#fff"
      />
    </G>
  </Svg>
);

export const HomeIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.5 1.5 0 012.122 0l8.954 8.955M21 12v9a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 21v-9m18 0l-9-9-9 9" />
  </Svg>
);

export const SearchIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </Svg>
);

export const CameraIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
    <Path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
  </Svg>
);

export const PencilAltIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </Svg>
);

export const UserIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </Svg>
);

export const BellIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </Svg>
);

export const HeartIcon: React.FC<ToggleIconProps> = ({ color = "#fff", size = 24, liked = false }) => (
  <Svg width={size} height={size} fill={liked ? color : 'none'} stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </Svg>
);

export const CommentIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
  </Svg>
);

export const RepostIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M4 12v-3a3 3 0 0 1 3 -3h13m-3 -3l3 3l-3 3" />
    <Path strokeLinecap="round" strokeLinejoin="round" d="M20 12v3a3 3 0 0 1 -3 3h-13m3 3l-3 -3l3 -3" />
  </Svg>
);

export const BookmarkIcon: React.FC<ToggleIconProps> = ({ color = "#fff", size = 24, saved = false }) => (
  <Svg width={size} height={size} fill={saved ? color : 'none'} stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
  </Svg>
);

export const TrashIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </Svg>
);

export const XIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </Svg>
);

export const PlusIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </Svg>
);

export const ArrowRightIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </Svg>
);

export const ArrowLeftIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </Svg>
);

export const ImageIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </Svg>
);

export const FlipCameraIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M19.95 11.36a8.5 8.5 0 01-15.9 0M4.05 12.64a8.5 8.5 0 0115.9 0" />
  </Svg>
);

export const PencilIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
  </Svg>
);

export const TypeIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H4.5m3 0h3m-3 0V15m0 0h3m-3 0H4.5m0 0V3.75m0 0h1.5M13.5 9h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0h3.75m-3.75 0V3.75m0 11.25V3.75m0 11.25h1.5m3 0h3.75" />
  </Svg>
);

export const ShareIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M2 21l19-9-19-9v7l14 2-14 2z" />
  </Svg>
);

export const DownloadIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </Svg>
);

export const LockClosedIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </Svg>
);

export const PlusCircleIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </Svg>
);

export const MenuIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </Svg>
);

export const ThreeDotsVerticalIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill={color} viewBox="0 0 20 20">
    <Path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
  </Svg>
);

export const BlockIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </Svg>
);

export const LogoutIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </Svg>
);

export const EyeIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    <Path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </Svg>
);

export const ReplyIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
  </Svg>
);

export const HashtagIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />
  </Svg>
);

export const PollIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V5.25A2.25 2.25 0 0018 3H6A2.25 2.25 0 003.75 5.25v12.75A2.25 2.25 0 006 20.25z" />
  </Svg>
);

export const VerifiedIcon: React.FC<IconProps> = ({ color = "#fff", size = 20 }) => (
  <Svg width={size} height={size} fill={color} viewBox="0 0 24 24">
    <G>
      <Path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.083.965.238 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
    </G>
  </Svg>
);

export const CheckIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} strokeWidth="2.5" viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </Svg>
);

export const DoubleCheckIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} strokeWidth="2.5" viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M11.365 3.823a.75.75 0 01.065 1.06l-5.25 6a.75.75 0 01-1.13.01L2.26 8.393a.75.75 0 011.08-1.04l2.296 2.333L10.3 3.886a.75.75 0 011.065-.063zM19.5 3.823a.75.75 0 01.065 1.06l-6.75 7.5a.75.75 0 01-1.13.01L8.26 9.893a.75.75 0 011.08-1.04l2.296 2.333 5.8-6.386a.75.75 0 011.065-.063z" />
  </Svg>
);

export const FlagIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M5 14l4-2.5 4 2.5 4-2.5 2 1.25M5 5l4 2.5 4-2.5 4 2.5" />
  </Svg>
);

export const ReportIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
  </Svg>
);

export const SendIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </Svg>
);

export const StarIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill={color} strokeWidth="0" viewBox="0 0 24 24">
    <Path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.116 3.986 1.24 5.383c.236 1.024-.908 1.857-1.846 1.334l-4.706-2.917-4.706 2.917c-.938.523-2.082-.31-1.846-1.334l1.24-5.383-4.116-3.986c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.007z" clipRule="evenodd" />
  </Svg>
);

export const ChevronDownIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </Svg>
);

export const ChevronUpIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
  </Svg>
);

export const ShareIOSIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill={color} viewBox="0 0 20 20">
    <Path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
  </Svg>
);

export const AddToHomeScreenIOSIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill={color} viewBox="0 0 20 20">
    <Path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
  </Svg>
);

export const MoreVertAndroidIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill={color} viewBox="0 0 20 20">
    <Path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
  </Svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <Path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </Svg>
);
