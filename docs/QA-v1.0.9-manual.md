# Ahlan Social v1.0.9 — Manuel (telefon) kabul testi

Bu liste fiziksel cihaz gerektiren maddeler içindir. Sunucu tarafı doğrulamalar
(RLS, RPC yetkileri, cascade silmeler, storage politikaları) ayrıca yapıldı ve
`docs/QA-v1.0.9-backend.md` (scratch: qa_backend_test.out) içinde kanıtlı.

## Hazırlık

1. Telefonda v1.0.8 varsa **kaldır** (v1.0.9 yeni imza anahtarıyla imzalı; üzerine kurulmaz).
2. v1.0.9 APK'sını kur (GitHub Release: `AhlanSocial-v1.0.9.apk`).
3. Üç hesap hazırla:
   - **A** = normal kullanıcı (test hesabı)
   - **B** = normal kullanıcı (ikinci test hesabı, ayrı cihaz veya çıkış/giriş)
   - **ahlan** = admin (mavi rozetli; `ionhadram@gmail.com`)
4. Öneri: A ve B'yi iki farklı cihazda aç (blok testi tek cihazda da yapılabilir ama iki cihaz daha net).
5. Her madde için: GEÇTİ / KALDI işaretle. KALDIYSA **ekran görüntüsü + adımlar** ekle.

| # | Test | Beklenen | Sonuç |
|---|---|---|---|
| 1 | Arka plan / launcher davranışı | Profil'de kalır, Bildirimler açılmaz | ☐ GEÇTİ ☐ KALDI |
| 2 | Story halkası hizası | Your story = diğerleri, birlikte kayar | ☐ GEÇTİ ☐ KALDI |
| 3 | Block / Unblock çökmemeli | Çökme yok | ☐ GEÇTİ ☐ KALDI |
| 4 | İki yönlü engelleme | A görünmez, etkileşim yok | ☐ GEÇTİ ☐ KALDI |
| 5 | Mavi rozet görünümü | Profil/gönderi/yorum/takipçi | ☐ GEÇTİ ☐ KALDI |
| 6 | Rozet ver/al, kalıcılık | Kalıcı; admin olmayan göremez | ☐ GEÇTİ ☐ KALDI |
| 7 | Terms / Privacy metni | Sadece telif satırı | ☐ GEÇTİ ☐ KALDI |
| 8 | Çevrimdışı önbellek + hesap izolasyonu | Anında veri, sızıntı yok | ☐ GEÇTİ ☐ KALDI |
| 9 | WebP sıkıştırma + avatar kalıcılığı | .webp, ≤1080px, birkaç yüz KB | ☐ GEÇTİ ☐ KALDI |
| 10 | Yorum silme yetkileri | Doğru kişiler silebilir | ☐ GEÇTİ ☐ KALDI |
| 11 | Kamera/galeri/izinler | Depolama izni istenmez | ☐ GEÇTİ ☐ KALDI |

---

## 1. Launcher / geri dönüş davranışı (özellikle Samsung)

1. Uygulamayı aç → **Profil** sekmesine git.
2. **Home** tuşuyla arka plana at.
3. Uygulama simgesine bas.

**Beklenen:** Profil sekmesinde kalır; **Bildirimler ekranı açılmaz.**
**Tekrar:** 5 kez. Farklı launcher varsa (Samsung One UI, Nova) her birinde dene.
**KALDIYSA:** hangi telefon/launcher, kaçıncı denemede, hangi ekran açıldı + ekran görüntüsü.

> Not: bu davranış `launchMode`/intent filtresi kaynaklıdır, sunucudan doğrulanamaz.

## 2. Story halkası hizası

1. Ana sayfa → story satırı.
2. "Your story" (Ahlan logosu) ile diğer halkaları karşılaştır.
3. Satırı yatay kaydır.

**Beklenen:** Aynı boy, aynı halka kalınlığı, aynı hizada; hepsi **tek satırda birlikte** kayar.
**KALDIYSA:** ekran görüntüsü (hizasızlık görünür olmalı).

## 3. Block / Unblock çökmemeli

1. A hesabıyla B'nin profiline git → **⋯** → **Block**.
2. Profil ekranına dön → **Unblock**.

**Beklenen:** İkisinde de çökme yok; durum anında güncellenir.
**Sunucu tarafı (doğrulandı):** `block_user` / `unblock_user` RPC'leri hatasız çalışıyor, tekrar çağrıda da sorun yok (idempotent).
**KALDIYSA:** çökme logu / "Uygulama durduruldu" ekranı + adımlar.

## 4. İki yönlü engelleme (B'nin gözünden)

Önce A, B'yi bloklasın. Sonra B hesabıyla:

1. A'nın profiline git → **"This account isn't available"** görünmeli.
2. Akışta A'nın gönderileri, story'leri ve yorumları **görünmemeli**.
3. Aramada A **çıkmamalı**; mesajlarda A'nın mesajları **görünmemeli**.
4. B, A'yı takip etmeye çalışmalı → **engellenmeli**.
5. Takip listeleri: A↔B takipleri **iki yönde de kalkmış** olmalı.
6. B'nin A'nın gönderilerine yaptığı **yorum ve beğeniler silinmiş** olmalı.

**Sunucu tarafı (doğrulandı, 32/32 PASS):** posts/stories/comments görünmezliği,
takip silinmesi (iki yön), yorum/beğeni temizliği, bildirim temizliği,
yeni beğeni/yorum/takip/mesaj/bildirim denemelerinin `42501` ile reddi.
**Kalan:** yalnızca UI metni/rendering → ekran görüntüsüyle teyit.

## 5. Mavi rozet görünümü

`ahlan` hesabının adının yanında mavi tik şu ekranlarda:
profil · gönderi · yorum · takipçi listesi.

**Sunucu tarafı (doğrulandı):** `is_admin=true`, `is_verified=true`.
**Kalan:** görsel doğrulama (4 ekran görüntüsü).

## 6. Rozet ver / al (admin) + yetki

1. `ahlan` ile B'nin profiline git → **Give Blue Badge** → B'nin profilinde rozet görünmeli.
2. Uygulamayı tamamen kapat, aç → **rozet kalıcı** olmalı.
3. **Remove Blue Badge** → **onay sorusu** çıkmalı → onayla → rozet kalkmalı.
4. A (admin değil) hesabıyla B'nin profiline git → bu düğmeler **görünmemeli**.

**Sunucu tarafı (doğrulandı):** `admin_set_verified` admin için `true` döndürüp kalıcı yazıyor;
**admin olmayan çağrı `42501 Only admins can change verification status`** ile reddediliyor;
kullanıcı kendi `is_verified` alanını UPDATE ile değiştiremiyor (trigger geri alıyor).
**Kalan:** düğme görünürlüğü + kapat/aç sonrası kalıcılık (istemci önbelleği) → ekran görüntüsü.

## 7. Terms / Privacy metni

Ayarlar → Terms ve Privacy.

**Beklenen:** Kaynak kod linki YOK, lisans metni YOK; sadece
`© 2026 Ahlan Social. All rights reserved.`
**KALDIYSA:** ekran görüntüsü.

## 8. Çevrimdışı önbellek + hesap izolasyonu

1. Akışı ve bir profili aç (veri yüklensin).
2. Uygulamayı **tamamen kapat**.
3. **Uçak modu**nu aç, uygulamayı aç.

**Beklenen:** Son veriler anında görünür; boş ekran / sonsuz yükleme yok.
4. Uçak modunu kapat → arka planda sessizce yenilenir (ekran boşalmaz).
5. Çıkış yap, **başka hesapla** gir → önceki hesabın verisi görünmez.

**Sunucu tarafı (doğrulandı):** RLS, B hesabının A'nın gönderi/story/yorumlarını
görmesini engelliyor → hesap izolasyonunun veri katmanı kanıtlı.
**Kalan:** cihaz önbelleği davranışı → ekran görüntüsü/video.

## 9. WebP sıkıştırma + avatar kalıcılığı

1. 12 MP bir fotoğrafla: **gönderi paylaş**, **story ekle**, **profil fotoğrafını değiştir**.
2. Profil fotoğrafını kaydettikten sonra uygulamayı kapat/aç → **kalıcı** olmalı.

**Beklenen (Supabase Storage'da):** dosyalar `.webp`, genişlik ≤ **1080px**, boyut birkaç yüz KB.
**Sunucu tarafı (doğrulandı):** `avatars` bucket'ı var (public, 10 MB limit, `image/jpeg|png|webp`),
`media`/`uploads`/`story-media` bucket'larında `image/webp` + `image/jpeg` izinli,
`avatars/<uid>/...` yazma politikası (`ahlan_avatars_insert/update`) aktif.
**Nasıl doğrularız:** sen yükledikten sonra bana haber ver — ben Storage'daki nesneleri
listeleyip uzantı/boyut/genişlik kontrolünü yaparım (bkz. "Sunucu kontrolü" altındaki komut).

## 10. Yorum silme yetkileri

1. B, A'nın gönderisine yorum yapsın.
2. A o yorumu silsin → **onay sorusu** çıkmalı → silinmeli.
3. B kendi yorumunu silsin → silinmeli.
4. A, B'nin gönderisindeki B'ye ait yorumu silmeye çalışsın → **sil düğmesi görünmemeli**.

**Sunucu tarafı (doğrulandı):**
- B, **kendi gönderisindeki** A yorumunu silebiliyor → `rowcount=1` (PASS)
- B, **A'nın kendi gönderisindeki** A yorumunu silemiyor → `rowcount=0` (PASS)
- Yorum silinince bağlı `notifications`/`comment_likes` kayıtları CASCADE ile gidiyor.
**Kalan:** düğme görünürlüğü + onay diyaloğu → ekran görüntüsü.

## 11. Kamera / galeri / izinler

1. Kamera ile fotoğraf çek → gönderi/story'ye eklensin.
2. Galeriden fotoğraf seç.
3. İzin istemlerini izle.

**Beklenen:** Kamera ve galeri çalışır; **depolama/medya izni istenmez** (sistem fotoğraf seçici);
**bildirim izni** sorulur.
**Kod kanıtı (app.json):** izinler `CAMERA`, `POST_NOTIFICATIONS`, `VIBRATE`;
`READ_MEDIA_*`, `READ/WRITE_EXTERNAL_STORAGE`, `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW` **blocked** listesinde.
**Kalan:** cihazda gerçek izin diyaloğu davranışı → ekran görüntüsü.

---

## Sunucu kontrolü (yükledikten sonra ben yaparım)

Sen paylaşımı yaptıktan sonra, yüklenen nesneleri doğrulamak için:

```sql
SELECT bucket_id, name, (metadata->>'size')::int AS bytes,
       metadata->>'mimetype' AS mime, metadata->>'width' AS w, metadata->>'height' AS h,
       created_at
FROM storage.objects
WHERE bucket_id IN ('avatars','media','uploads','stories','story-media')
ORDER BY created_at DESC LIMIT 20;
```

Beklenen: `mime = image/webp`, `w <= 1080`, `bytes` birkaç yüz KB.
