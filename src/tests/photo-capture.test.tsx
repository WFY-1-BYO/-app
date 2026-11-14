import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PhotoCapture from '../components/PhotoCapture'

describe('V1.4 改动 4/9：拍摄 + 上传双按钮', () => {
  it('渲染「拍摄」和「上传图片」两个按钮，隐藏文件输入不显示原生控件', () => {
    render(
      <PhotoCapture label="食材照片" onFile={() => {}} />,
    )
    expect(screen.getByRole('button', { name: /拍摄/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /上传图片/ })).toBeInTheDocument()
    // 两个隐藏 input 仍可被辅助技术定位（有明确的 aria-label）
    expect(screen.getByLabelText('食材照片：拍摄')).toBeInTheDocument()
    expect(screen.getByLabelText('食材照片：上传')).toBeInTheDocument()
  })

  it('从上传入口选择文件后调用 onFile 并清空 input，避免重复选择同名文件失效', async () => {
    const onFile = vi.fn()
    const user = userEvent.setup()
    render(<PhotoCapture label="食材照片" onFile={onFile} />)

    const file = new File(['fake-image'], '西红柿.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('食材照片：上传'), file)

    expect(onFile).toHaveBeenCalledTimes(1)
    expect(onFile).toHaveBeenCalledWith(file)
    expect(
      (screen.getByLabelText('食材照片：上传') as HTMLInputElement).value,
    ).toBe('')
  })

  it('关闭拍摄入口时只保留上传按钮（非图片文件场景）', () => {
    render(
      <PhotoCapture
        label="健康数据文件"
        accept="image/*,.pdf,.csv,text/*"
        allowCamera={false}
        uploadLabel="选择文件"
        onFile={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: /拍摄/ })).toBeNull()
    expect(screen.getByRole('button', { name: '选择文件' })).toBeInTheDocument()
    expect(screen.getByLabelText('健康数据文件：上传')).toBeInTheDocument()
  })

  it('点击拍摄按钮会触发相机 input 的选择框（由 input 接管，按钮本身不传文件）', async () => {
    const user = userEvent.setup()
    const onFile = vi.fn()
    render(<PhotoCapture label="食材照片" onFile={onFile} />)

    await user.click(screen.getByRole('button', { name: /拍摄/ }))
    // 真机上调起相机；jsdom 里验证点击没有误传文件
    expect(onFile).not.toHaveBeenCalled()
  })
})

describe('V1.4 改动 5：手动添加食材的用量框说明', () => {
  it('用量框带「克」单位标注和生活化说明', async () => {
    // 真实页面渲染，确认文案可见
    const { default: MealNew } = await import('../pages/MealNew')
    const { BrowserRouter } = await import('react-router-dom')
    const { useAppStore, emptyAppData } = await import('../store/appStore')
    useAppStore.setState({
      data: structuredClone(emptyAppData),
      initialized: true,
    })
    render(
      <BrowserRouter>
        <MealNew />
      </BrowserRouter>,
    )
    expect(screen.getByLabelText('用量，单位克')).toBeInTheDocument()
    expect(screen.getByText(/单位是克/)).toBeInTheDocument()
    expect(screen.getByText(/一杯米饭约 200 克/)).toBeInTheDocument()
  })
})
