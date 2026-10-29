package com.ecotrace.passport;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

/** Tạo ảnh PNG mã QR trỏ tới trang kiểm tra công khai (mục 10.2). */
@Service
public class QrCodeService {

    public byte[] toPng(String url, int sizePx) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            BitMatrix matrix = new QRCodeWriter().encode(url, BarcodeFormat.QR_CODE, sizePx, sizePx);
            MatrixToImageWriter.writeToStream(matrix, "PNG", out);
            return out.toByteArray();
        } catch (WriterException | IOException e) {
            throw new IllegalStateException("Failed to generate QR code", e);
        }
    }
}

