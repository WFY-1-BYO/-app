package com.family.nutritionist;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/**
 * 关闭 WebView 的原生长按文字选择，避免弹出「复制 / 分享 / 全选 / 朗读」这类
 * 网页式菜单。输入框仍可正常编辑、长按粘贴 DeepSeek 密钥。
 * Web 层另有一份 CSS + JS 兜底（src/index.css、src/lib/nativeUi.ts）。
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.setLongClickable(false);
            webView.setHapticFeedbackEnabled(false);
            webView.setOnLongClickListener(new View.OnLongClickListener() {
                @Override
                public boolean onLongClick(View v) {
                    // 返回 true 表示长按已消费，不再触发系统文字选择 ActionMode
                    return true;
                }
            });
        }
    }
}
